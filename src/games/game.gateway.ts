import { forwardRef, Inject, UseFilters, UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtAuthGuard } from 'src/auth/guards/ws-jwt-auth.guard';
import { UnauthorizedExceptionFilter } from 'src/auth/filters/ws-auth.filter';
import { GamesService } from 'src/games/games.service';
import { AuthService } from 'src/auth/auth.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Game } from './entities/game.entity';
import { LobbyGateway } from 'src/lobby/lobby.gateway';
import { ConnectedUser } from './types/connectedUser.interface';

//Checker à chaque fois si la game (locale) existe

@UseFilters(UnauthorizedExceptionFilter)
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({ cors: true, namespace: 'game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  gameSlots = 1;
  currentTracks = {};

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private readonly gamesService: GamesService,
    private readonly authService: AuthService,
    @Inject(forwardRef(() => LobbyGateway))
    private readonly lobbyGateway: LobbyGateway,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    console.log('USER CONNECTED');
    const user = await this.authService.verify(client.handshake.auth.token);

    if (!user) {
      client.disconnect();
      return;
    }
    console.log('| USER CONNECTED');
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log('USER LEFT');
    const game = await this.getGameFromClientId(client.id);

    if (!game) {
      return;
    }

    await this.gamesService.update(game, {
      connectedUsers: game.connectedUsers.filter(
        (connectedUser) => connectedUser.clientId !== client.id,
      ),
    });

    if (game.connectedUsers.length - 1 <= 0) {
      this.endGameIfEmptyInterval(game.id);
    }

    this.server.to(game.id).emit('userLeft', client.id);
    console.log('| USER LEFT');
  }

  @SubscribeMessage('joinGame')
  async joinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody('id') id: string,
  ) {
    const user = await this.authService.verify(client.handshake.auth.token);
    const game = await this.gamesService.findOne(undefined);

    if (user && game) {
      await this.gamesService.update(game, {
        connectedUsers: [
          ...game.connectedUsers,
          { name: user.name, id: user.id, clientId: client.id },
        ],
      });

      this.getGameFromClientId(client.id);

      // if (game.users.length + 1 >= this.gameSlots) {
      //   console.log('START BECAUSE GAME IS FULL');
      //   this.gameInterval(await this.gamesService.findOne(game.id));
      // }

      await client.join(id);
      this.server.to(id).emit('userJoined', { id: user.id, name: user.name });

      console.log('USER JOINED');
      return { status: 'OK', content: null };
    }
    console.log('USER FAILED TO JOIN');
    return { status: 'KO', content: null };
  }

  async getGameFromClientId(clientId: string) {
    const games: Game[] = await this.gamesService.findAll();

    const game = games.filter(
      (game: Game) =>
        game.connectedUsers.filter(
          (user: ConnectedUser) => user.clientId === clientId,
        )[0],
    )[0];

    return game;
  }

  getGameIdFromRooms(rooms: any) {
    const regexExp =
      /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;

    rooms = Array.from(rooms);

    const gameRoom = rooms.filter((room: any) => regexExp.test(room[0]));

    if (gameRoom[0]) {
      return gameRoom[0][0];
    }
  }

  //TODO faire un decorateur qui get la game depuis les rooms
  @SubscribeMessage('users')
  async users(@ConnectedSocket() client: Socket) {
    const gameId = this.getGameIdFromRooms(client['adapter'].rooms);
    if (!gameId) {
      return {
        status: 'KO',
        content: 'You must be connected to a game.',
      };
    }

    const game = await this.gamesService.findOne(gameId);

    return {
      status: 'OK',
      content: game.connectedUsers,
    };
  }

  @SubscribeMessage('guess')
  async guess(@ConnectedSocket() client: Socket, @MessageBody() guess: string) {
    const gameId = this.getGameIdFromRooms(client['adapter'].rooms);
    if (!gameId) {
      return {
        status: 'KO',
        content: 'You must be connected to a game.',
      };
    }

    let answer = 'none'; //TODO improve this system

    if (guess === this.currentTracks[gameId].song) {
      answer = 'name';
    }
    if (guess === this.currentTracks[gameId].artist) {
      answer === 'name' ? 'both' : 'artist';
    }

    this.server
      .to(gameId)
      .emit('guess', { clientId: client.id, guess: guess, answer });

    return { status: 'OK', content: null };
  }

  @SubscribeMessage('message')
  async message(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: string,
  ) {
    const gameId = this.getGameIdFromRooms(client['adapter'].rooms);
    if (!gameId) {
      return {
        status: 'KO',
        content: 'You must be connected to a game.',
      };
    }

    this.server
      .to(gameId)
      .emit('message', { clientId: client.id, message: message });

    return { status: 'OK', content: null };
  }

  @SubscribeMessage('startGame')
  async startGame(@ConnectedSocket() client: Socket) {
    const gameId = this.getGameIdFromRooms(client['adapter'].rooms);
    if (!gameId) {
      return {
        status: 'KO',
        content: 'You must be connected to a game.',
      };
    }
    const game = await this.gamesService.findOne(gameId);

    // const user = await this.authService.verify(client.handshake.auth.token);
    // if (!user || game.user.id !== user.id) {
    //   return {
    //     status: 'FORBIDEN',
    //     message: 'You are not allowed to do this action on this game',
    //   };
    // }

    console.log('START REQUESTED');

    this.gameInterval(gameId);
    return { status: 'OK', content: null };
  }

  @SubscribeMessage('deleteGame')
  async deleteGame(@ConnectedSocket() client: Socket) {
    const gameId = this.getGameIdFromRooms(client['adapter'].rooms);
    if (!gameId) {
      return {
        status: 'KO',
        content: 'You must be connected to a game.',
      };
    }
    const game = await this.gamesService.findOne(gameId);

    console.log('DELETE REQUESTED');
    // const user = await this.authService.verify(client.handshake.auth.token);
    // if (!user || game.user.id !== user.id) {
    //   return {
    //     status: 'FORBIDEN',
    //     message: 'You are not allowed to do this action on this game',
    //   };
    // }

    this.endGameInterval(gameId);
    return { status: 'OK', content: null };
  }

  async playTrack(gameId: string) {
    const game = await this.gamesService.findOne(gameId);

    if (!game.tracks[0]) {
      console.log('NO MORE TRACKS');
      this.server.emit('gameFinished', { id: gameId });
      this.endGameInterval(gameId);
      this.schedulerRegistry.deleteInterval(`game-${gameId}`);
      return;
    }
    this.currentTracks[gameId] = game.tracks[0];
    console.log('NEW TRACK');
    this.server.emit('newTrack', { ...game.tracks[0] });

    game.tracks.shift();
    await this.gamesService.update(game, { tracks: game.tracks });
  }

  gameInterval(gameId: string) {
    const callback = async () => {
      this.playTrack(gameId);
    };

    if (this.schedulerRegistry.doesExist('interval', `game-${gameId}`)) {
      return;
    }

    console.log('GAME STARTED');
    this.server.to(`${gameId}`).emit('gameStarted', {});

    this.playTrack(gameId);

    const interval = setInterval(callback, 15000);
    this.schedulerRegistry.addInterval(`game-${gameId}`, interval);
  }

  endGameInterval(gameId: string) {
    const callback = async () => {
      this.removeGame(gameId);
      this.schedulerRegistry.deleteInterval(`end-game-${gameId}`);
    };

    if (this.schedulerRegistry.doesExist('interval', `end-game-${gameId}`)) {
      return;
    }

    console.log('GAME FINISHED');
    this.server.emit('gameFinished', {});

    const interval = setInterval(callback, 1000);
    this.schedulerRegistry.addInterval(`end-game-${gameId}`, interval);
  }

  endGameIfEmptyInterval(gameId: string) {
    const callback = async () => {
      const game = await this.gamesService.findOne(gameId);

      if (game.connectedUsers.length === 0) {
        this.removeGame(game.id);
        this.schedulerRegistry.deleteInterval(`end-game-if-empty-${gameId}`);
        return;
      }
      this.schedulerRegistry.deleteInterval(`end-game-if-empty-${gameId}`);
    };

    if (
      this.schedulerRegistry.doesExist(
        'interval',
        `end-game-if-empty-${gameId}`,
      )
    ) {
      return;
    }
    console.log('GAME EMPTY');
    const interval = setInterval(callback, 5000);
    this.schedulerRegistry.addInterval(`end-game-if-empty-${gameId}`, interval);
  }

  async removeGame(gameId: string) {
    console.log('GAME DELETED');

    await this.gamesService.delete(gameId);
    await this.lobbyGateway.sendGameDeleted(gameId);
    this.server.emit('gameDeleted', { id: gameId });
  }
}
