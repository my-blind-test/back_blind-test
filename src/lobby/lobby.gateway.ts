import {
  ClassSerializerInterceptor,
  forwardRef,
  Inject,
  UseFilters,
  UseGuards,
  UseInterceptors,
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
import { CreateGameDto } from 'src/games/dto/create-game.dto';
import { GamesService } from 'src/games/games.service';
import { AuthService } from 'src/auth/auth.service';
import { QueryFailedFilter } from './filters/QuerryFailed.filter';
import { User, UserStatus } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { Game } from 'src/games/entities/game.entity';
import { instanceToPlain } from 'class-transformer';

@UseFilters(UnauthorizedExceptionFilter)
@UseFilters(QueryFailedFilter)
@UseGuards(WsJwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@WebSocketGateway({ cors: true, namespace: 'lobby' })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  constructor(
    @Inject(forwardRef(() => GamesService))
    private readonly gamesService: GamesService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    const user: User = await this.authService.verify(
      client.handshake.auth.token,
    );

    if (user) {
      client.broadcast.emit('userJoined', instanceToPlain(user));

      this.usersService.update(user.id, {
        clientId: client.id,
        status: UserStatus.LOBBY,
      });
    } else {
      client.disconnect();
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const user: User = await this.usersService.findOneFromClientId(client.id);

    if (user) {
      this.usersService.update(user.id, { status: UserStatus.OFFLINE });
    }

    this.server.emit('userLeft', client.id);
  }

  @SubscribeMessage('users')
  async Users() {
    const users: User[] = await this.usersService.findAllFromStatus(
      UserStatus.LOBBY,
    );

    return { status: 'OK', content: users };
  }

  @SubscribeMessage('games')
  async games() {
    const games: Game[] = await this.gamesService.findAll();

    return { status: 'OK', content: games };
  }

  @SubscribeMessage('createGame')
  async createGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() createGameDto: CreateGameDto,
  ) {
    const user: User = await this.authService.verify(
      client.handshake.auth.token,
    );
    const game: Game = await this.gamesService.create({
      ...createGameDto,
      adminId: user.id,
    });

    if (!game) {
      return { status: 'KO', content: "Couldn't load tracks" };
    }

    this.server.emit('newGame', instanceToPlain(game));
    return { status: 'OK', content: null };
  }

  @SubscribeMessage('joinGame')
  async joinGame(
    @MessageBody('id') id: string,
    @MessageBody('password') password: string,
  ) {
    const game: Game = await this.gamesService.findOne(id);

    if (!game || game.password !== password)
      return { status: 'KO', content: 'Wrong password' };

    return { status: 'OK', content: null };
  }

  async emitGameDeleted(id: string) {
    this.server.emit('gameDeleted', id);
  }

  async emitGameUpdated(id: string) {
    const game: Game = await this.gamesService.findOne(id);

    this.server.emit('gameUpdated', instanceToPlain(game));
  }
}
