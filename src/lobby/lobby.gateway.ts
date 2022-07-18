import { UseFilters, UseGuards } from '@nestjs/common';
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
import { UpdateGameDto } from 'src/games/dto/update-game.dto';
import { GamesService } from 'src/games/games.service';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';
import { QueryFailedFilter } from './filters/QuerryFailed.filter';

@UseFilters(UnauthorizedExceptionFilter)
@UseFilters(QueryFailedFilter)
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({ cors: true, namespace: 'lobby' })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  connectedUsers = {};
  constructor(
    private readonly gamesService: GamesService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // Créer un décorateur sur client
  async handleConnection(@ConnectedSocket() client: Socket) {
    const user = await this.authService.verify(client.handshake.auth.token);

    if (user) {
      this.connectedUsers[client.id] = { id: user.id, name: user.name };

      client.broadcast.emit('userJoined', {
        [client.id]: { id: user.id, name: user.name },
      });
    } else {
      client.disconnect();
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    delete this.connectedUsers[client.id];
    this.server.emit('userLeft', client.id);
  }

  @SubscribeMessage('users')
  async Users() {
    return { status: 'OK', content: this.connectedUsers };
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
    const newGame = await this.gamesService.create(createGameDto, user);

    this.server.emit('newGame', { [newGame.id]: { name: newGame.name } });
    return { status: 'OK', content: null }; //TODO stocker tous les status dans un fichier utils
  }

  @SubscribeMessage('updateGame')
  async updateGame(
    @ConnectedSocket() client: Socket,
    @MessageBody('id') id: string,
    @MessageBody('body') updateGameDto: UpdateGameDto,
  ) {
    const game = await this.gamesService.findOne(id);

    if (!game) {
      return {
        status: 'BAD_REQUEST',
        message: "This game doesn't exist",
      };
    }
    const user = await this.authService.verify(client.handshake.auth.token);

    if (!user || game.user.id !== user.id) {
      return {
        status: 'FORBIDEN',
        message: 'You are not allowed to do this action on this game.',
      };
    }

    await this.gamesService.update(game, updateGameDto);
    this.server.emit('gameUpdated', game);

    return { status: 'OK', content: null };
  }

  @SubscribeMessage('deleteGame')
  async deleteGame(
    @ConnectedSocket() client: Socket,
    @MessageBody('id') id: string,
  ) {
    const game = await this.gamesService.findOne(id);

    if (!game) {
      return {
        status: 'BAD_REQUEST',
        message: "This game doesn't exist",
      };
    }
    const user = await this.authService.verify(client.handshake.auth.token);

    if (!user || game.user.id !== user.id) {
      return {
        status: 'FORBIDEN',
        message: 'You are not allowed to do this action on this game',
      };
    }

    await this.gamesService.remove(id);
    this.server.emit('gameDeleted', id);

    return { status: 'OK', content: null };
  }
}
