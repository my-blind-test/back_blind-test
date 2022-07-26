import {
  forwardRef,
  Inject,
  Injectable,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
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
import { Game } from './entities/game.entity';
import { ConnectedUser } from './types/connectedUser.interface';
import { GamesInterval } from './games.interval';
import { Track } from './types/track.interface';

//Checker à chaque fois si la game (locale) existe

@UseFilters(UnauthorizedExceptionFilter)
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({ cors: true, namespace: 'game' })
@Injectable()
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  gameSlots = 1;
  currentTracks = {};

  constructor(
    private readonly gamesService: GamesService,
    @Inject(forwardRef(() => GamesInterval))
    private readonly gamesInterval: GamesInterval,
    private readonly authService: AuthService,
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
      this.gamesInterval.endGameIfEmptyInterval(game.id);
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
      //   this.gamesInterval.gameInterval(await this.gamesService.findOne(game.id));
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

    this.gamesInterval.gameInterval(gameId);
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

    this.server.emit('gameFinished', {});
    this.gamesInterval.endGameInterval(gameId);
    return { status: 'OK', content: null };
  }

  updateCurrentTracks(gameId: string, track: Track) {
    this.currentTracks[gameId] = track;
  }

  socketInstance() {
    return this.server;
  }
}
