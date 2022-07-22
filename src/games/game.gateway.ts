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
import { GamesService } from 'src/games/games.service';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';

@UseFilters(UnauthorizedExceptionFilter)
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({ cors: true, namespace: 'game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  connectedUsers = [];
  constructor(
    private readonly gamesService: GamesService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // Créer un décorateur sur client
  async handleConnection(@ConnectedSocket() client: Socket) {
    const user = await this.authService.verify(client.handshake.auth.token);

    if (user) {
      this.connectedUsers.push({
        id: user.id,
        name: user.name,
        clientId: client.id,
        score: 0,
      });

      client.broadcast.emit('userJoined', { id: user.id, name: user.name });
    } else {
      client.disconnect();
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    this.connectedUsers.splice(
      this.connectedUsers.findIndex(
        (connectUser) => connectUser.id === client.id,
      ),
      1,
    );

    this.server.emit('userLeft', client.id);
  }

  @SubscribeMessage('users')
  async users() {
    return { status: 'OK', content: this.connectedUsers };
  }

  @SubscribeMessage('guess')
  async guess(@ConnectedSocket() client: Socket, @MessageBody() guess: string) {
    this.server.emit('guess', { clientId: client.id, guess: guess });

    return { status: 'OK', content: null };
  }

  @SubscribeMessage('message')
  async message(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: string,
  ) {
    this.server.emit('message', { clientId: client.id, message: message });

    return { status: 'OK', content: null };
  }
}
