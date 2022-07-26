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
import { CreateGameDto } from 'src/games/dto/create-game.dto';
import { GamesService } from 'src/games/games.service';
import { AuthService } from 'src/auth/auth.service';
import { QueryFailedFilter } from './filters/QuerryFailed.filter';
import { User, UserStatus } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { Game } from 'src/games/entities/game.entity';

@UseFilters(UnauthorizedExceptionFilter)
@UseFilters(QueryFailedFilter)
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({ cors: true, namespace: 'lobby' })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  constructor(
    @Inject(forwardRef(() => GamesService))
    private readonly gamesService: GamesService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // Créer un décorateur sur client
  async handleConnection(@ConnectedSocket() client: Socket) {
    const user = await this.authService.verify(client.handshake.auth.token);

    if (user) {
      client.broadcast.emit('userJoined', {
        id: user.id,
        name: user.name,
        clientId: client.id,
      });

      this.usersService.update(user.id, {
        clientId: client.id,
        status: UserStatus.LOBBY,
      });
    } else {
      client.disconnect();
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const user = await this.usersService.findOneFromClientId(client.id);

    if (user) {
      this.usersService.update(user.id, { status: UserStatus.OFFLINE });
    }

    this.server.emit('userLeft', client.id);
  }

  @SubscribeMessage('users')
  async Users() {
    const users: User[] = await this.usersService.findAllFromStatus(
      UserStatus.LOBBY,
    ); //TODO retirer les champs inutiles

    return { status: 'OK', content: users };
  }

  @SubscribeMessage('games')
  async Games() {
    const games = await this.gamesService.findAll();

    return { status: 'OK', content: games };
  }

  @SubscribeMessage('createGame')
  async createGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() createGameDto: CreateGameDto,
  ) {
    const user = await this.authService.verify(client.handshake.auth.token);
    const newGame = await this.gamesService.create({
      ...createGameDto,
      adminId: user.id,
    });

    this.server.emit('newGame', { id: newGame.id, name: newGame.name });
    return { status: 'OK', content: null };
  }

  async emitGameDeleted(id: string) {
    this.server.emit('gameDeleted', id);
  }

  async emitGameUpdated(game: Game) {
    this.server.emit('gameUpdated', { game });
  }
}
