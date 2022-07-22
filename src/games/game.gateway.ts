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

@UseFilters(UnauthorizedExceptionFilter)
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({ cors: true, namespace: 'game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  connectedUsers = [];
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private readonly gamesService: GamesService,
    private readonly authService: AuthService,
    @Inject(forwardRef(() => LobbyGateway))
    private readonly lobbyGateway: LobbyGateway,
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

  @SubscribeMessage('startGame')
  async startGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() id: string,
  ) {
    console.log(id);
    const game = await this.gamesService.findOne(id);
    if (!game) {
      return {
        status: 'BAD_REQUEST',
        message: "This game doesn't exist",
      };
    }

    // const user = await this.authService.verify(client.handshake.auth.token);
    // if (!user || game.user.id !== user.id) {
    //   return {
    //     status: 'FORBIDEN',
    //     message: 'You are not allowed to do this action on this game',
    //   };
    // }

    this.server.emit('gameStarted', {});
    this.gameInterval(game);
    return { status: 'OK', content: null };
  }

  @SubscribeMessage('deleteGame')
  async deleteGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() id: string,
  ) {
    const game = await this.gamesService.findOne(id);
    if (!game) {
      return {
        status: 'BAD_REQUEST',
        message: "This game doesn't exist",
      };
    }

    // const user = await this.authService.verify(client.handshake.auth.token);
    // if (!user || game.user.id !== user.id) {
    //   return {
    //     status: 'FORBIDEN',
    //     message: 'You are not allowed to do this action on this game',
    //   };
    // }

    this.server.emit('gameFinished', {});
    this.endGameInterval(game);
    return { status: 'OK', content: null };
  }

  gameInterval(game: Game) {
    const callback = async () => {
      if (!game.tracks[0]) {
        this.server.emit('gameFinished', { id: game.id });
        this.endGameInterval(game);
        this.schedulerRegistry.deleteInterval(`game-${game.id}`);
        return;
      }
      this.server.emit('newSong', { url: game.tracks[0] });

      game.tracks.shift();
      await this.gamesService.update(game, { tracks: game.tracks });
    };

    const interval = setInterval(callback, 3000);
    this.schedulerRegistry.addInterval(`game-${game.id}`, interval);
  }

  endGameInterval(game: Game) {
    const callback = async () => {
      this.server.emit('gameDeleted', { id: game.id });
      await this.lobbyGateway.sendGameDeleted(game.id);
      await this.gamesService.delete(game.id);
      this.schedulerRegistry.deleteInterval(`end-game-${game.id}`);
    };

    const interval = setInterval(callback, 5000);
    this.schedulerRegistry.addInterval(`end-game-${game.id}`, interval);
  }
}
