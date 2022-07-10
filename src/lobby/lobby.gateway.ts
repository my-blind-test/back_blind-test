import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CreateGameDto } from 'src/games/dto/create-game.dto';
import { UpdateGameDto } from 'src/games/dto/update-game.dto';
import { GamesService } from 'src/games/games.service';

@WebSocketGateway({ cors: true, namespace: 'lobby' })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  connectedUsers = [];
  constructor(private readonly gamesService: GamesService) {}

  async handleConnection(client: Socket) {
    this.connectedUsers = [...this.connectedUsers, { id: client.id }];
    const games = await this.gamesService.findAll();

    this.server.emit('users', this.connectedUsers);
    this.server.emit('games', games);
  }

  async handleDisconnect(client: Socket) {
    this.connectedUsers.splice(
      this.connectedUsers.findIndex((user) => user.id === client.id),
      1,
    );

    this.server.emit('users', this.connectedUsers);
  }

  @SubscribeMessage('createGame')
  async createGame(@MessageBody() createGameDto: CreateGameDto) {
    await this.gamesService.create(createGameDto);

    const games = await this.gamesService.findAll();
    this.server.emit('games', games);
  }

  @SubscribeMessage('updateGame')
  async updateGame(
    @MessageBody('id') id: number,
    @MessageBody('body') updateGameDto: UpdateGameDto,
  ) {
    await this.gamesService.update(id, updateGameDto);

    const games = await this.gamesService.findAll();
    this.server.emit('games', games);
  }

  @SubscribeMessage('remove')
  async remove(@MessageBody('id') id: number) {
    await this.gamesService.remove(id);

    const games = await this.gamesService.findAll();
    this.server.emit('games', games);
  }
}
