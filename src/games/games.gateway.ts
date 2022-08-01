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
import { Game, GameStatus } from './entities/game.entity';
import { ConnectedUser } from './types/connectedUser.interface';
import { GamesInterval } from './games.interval';
import { UsersService } from 'src/users/users.service';
import { User, UserStatus } from 'src/users/entities/user.entity';

//Checker à chaque fois si la game (locale) existe

@UseFilters(UnauthorizedExceptionFilter)
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({ cors: true, namespace: 'game' })
@Injectable()
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly gamesService: GamesService,
    @Inject(forwardRef(() => GamesInterval))
    private readonly gamesInterval: GamesInterval,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    console.log('USER CONNECTED');
    const user = await this.authService.verify(client.handshake.auth.token);

    if (!user) {
      client.disconnect();
      return;
    }

    this.usersService.update(user.id, { clientId: client.id });
    console.log('| USER CONNECTED');
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log('USER LEFT');
    const user: User = await this.usersService.findOneFromClientId(client.id);

    if (user) {
      this.usersService.update(user.id, {
        status: UserStatus.OFFLINE,
        gameId: null,
      });
    }

    const game: Game = await this.getGameFromClientId(client.id);

    if (!game) return;

    await this.gamesService.update(game.id, {
      adminId:
        client.id === game.adminId ? game.connectedUsers[0]?.id : game.adminId,
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
    const game = await this.gamesService.findOne(id);

    if (user && game) {
      await this.gamesService.update(game.id, {
        adminId: game.adminId ? game.adminId : client.id,
        connectedUsers: [
          ...game.connectedUsers,
          {
            name: user.name,
            id: user.id,
            clientId: client.id,
            score: user.score,
          },
        ],
      });

      this.usersService.update(user.id, {
        clientId: client.id,
        status: UserStatus.GAME,
        gameId: game.id,
      });

      // if (game.users.length + 1 >= game.slots) {
      //   console.log('START BECAUSE GAME IS FULL');
      //   this.gamesInterval.gameInterval(game);
      // }

      await client.join(id);
      this.server.to(id).emit('userJoined', {
        name: user.name,
        id: user.id,
        clientId: client.id,
        score: user.score,
      });

      console.log('USER JOINED');
      return {
        status: 'OK',
        content: {
          users: game.connectedUsers,
          gameStatus: game.status,
          trackUrl: game.currentTrack?.url,
        },
      };
    }
    console.log('USER FAILED TO JOIN');
    return { status: 'KO', content: null };
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
    const game: Game = await this.gamesService.findOne(gameId);
    if (game.status !== GameStatus.RUNNING || !game.currentTrack) return;

    let answer = 'none'; //TODO improve this system
    if (guess === game.currentTrack.song) {
      answer = 'song';
    }
    if (guess === game.currentTrack.artist) {
      answer === 'song' ? 'both' : 'artist';
    }

    this.server
      .to(gameId)
      .emit('guess', { clientId: client.id, guess, answer });

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

    // const game = await this.gamesService.findOne(gameId);
    // const user = await this.authService.verify(client.handshake.auth.token);
    // if (!user || game.adminId !== user.id) {
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

    // const game = await this.gamesService.findOne(gameId);
    // const user = await this.authService.verify(client.handshake.auth.token);
    // if (!user || game.user.id !== user.id) {
    //   return {
    //     status: 'FORBIDEN',
    //     message: 'You are not allowed to do this action on this game',
    //   };
    // }

    console.log('DELETE REQUESTED');

    this.server.emit('gameFinished', {});
    this.gamesInterval.endGameInterval(gameId);
    return { status: 'OK', content: null };
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

  socketInstance() {
    return this.server;
  }
}
