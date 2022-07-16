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

@UseFilters(UnauthorizedExceptionFilter)
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

      this.server.emit('users', this.connectedUsers);
    } else {
      client.disconnect();
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    delete this.connectedUsers[client.id];

    this.server.emit('users', this.connectedUsers);
  }

  @SubscribeMessage('createGame')
  async createGame(@MessageBody() createGameDto: CreateGameDto) {
    console.log('Create game');
    console.log(createGameDto);
    await this.gamesService.create(createGameDto);

    const games = await this.gamesService.findAll();
    this.server.emit('games', games);
    return { status: 'OK', message: null }; //TODO stocker tous les status dans un fichier utils
  }

  @SubscribeMessage('updateGame')
  async updateGame(
    @MessageBody('id') id: string,
    @MessageBody('body') updateGameDto: UpdateGameDto,
  ) {
    await this.gamesService.update(id, updateGameDto);

    const games = await this.gamesService.findAll();
    this.server.emit('games', games);
    return { status: 'OK', message: null };
  }

  @SubscribeMessage('remove')
  async remove(@MessageBody('id') id: string) {
    await this.gamesService.remove(id);

    const games = await this.gamesService.findAll();
    this.server.emit('games', games);
    return { status: 'OK', message: null };
  }
}
