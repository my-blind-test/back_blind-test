import { UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtAuthGuard } from 'src/auth/guards/ws-jwt-auth.guard';
import { CreateGameDto } from 'src/games/dto/create-game.dto';
import { UpdateGameDto } from 'src/games/dto/update-game.dto';
import { GamesService } from 'src/games/games.service';

@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({ cors: true, namespace: 'lobby' })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  connectedUsers = [];
  constructor(private readonly gamesService: GamesService) {}

  async handleConnection(client: Socket) {
    console.log('user connected');
    this.connectedUsers = [...this.connectedUsers, { id: client.id }];

    this.server.emit('users', this.connectedUsers);
  }

  async handleDisconnect(client: Socket) {
    console.log('user disconnected');
    this.connectedUsers.splice(
      this.connectedUsers.findIndex((user) => user.id === client.id),
      1,
    );

    this.server.emit('users', this.connectedUsers);
  }

  @SubscribeMessage('createGame')
  async createGame(@MessageBody() createGameDto: CreateGameDto) {
    console.log('Create game');
    console.log(createGameDto);
    await this.gamesService.create(createGameDto);

    const games = await this.gamesService.findAll();
    this.server.emit('games', games);
    return 'OK';
  }

  @SubscribeMessage('updateGame')
  async updateGame(
    @MessageBody('id') id: string,
    @MessageBody('body') updateGameDto: UpdateGameDto,
  ) {
    await this.gamesService.update(id, updateGameDto);

    const games = await this.gamesService.findAll();
    this.server.emit('games', games);
    return 'OK';
  }

  @SubscribeMessage('remove')
  async remove(@MessageBody('id') id: string) {
    await this.gamesService.remove(id);

    const games = await this.gamesService.findAll();
    this.server.emit('games', games);
    return 'OK';
  }
}
