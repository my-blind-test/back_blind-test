import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { GameStatus } from './entities/game.entity';
import { GamesGateway } from './games.gateway';
import { GamesService } from './games.service';
import { Track } from './types/track.interface';

@Injectable()
export class GamesInterval {
  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly gamesService: GamesService,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gameGateway: GamesGateway,
  ) {}

  gameInterval(gameId: string) {
    const callback = async () => {
      this.playTrack(gameId);
    };

    if (this.schedulerRegistry.doesExist('interval', `game-${gameId}`)) {
      return;
    }

    this.gameGateway
      .socketInstance()
      .to(`${gameId}`)
      .to(gameId)
      .emit('gameStarted', {});
    this.gamesService.update(gameId, { status: GameStatus.RUNNING });

    this.playTrack(gameId);

    const interval = setInterval(callback, 15000);
    this.schedulerRegistry.addInterval(`game-${gameId}`, interval);
  }

  endGameInterval(gameId: string) {
    const callback = async () => {
      this.removeGame(gameId);
      this.schedulerRegistry.deleteInterval(`end-game-${gameId}`);
    };

    if (this.schedulerRegistry.doesExist('interval', `end-game-${gameId}`)) {
      return;
    }

    this.gameGateway.socketInstance().to(gameId).emit('gameFinished', {});

    const interval = setInterval(callback, 1000);
    this.schedulerRegistry.addInterval(`end-game-${gameId}`, interval);
  }

  endGameIfEmptyInterval(gameId: string) {
    const callback = async () => {
      const game = await this.gamesService.findOne(gameId);

      if (game.connectedUsers.length === 0) {
        this.removeGame(game.id);
        this.schedulerRegistry.deleteInterval(`end-game-if-empty-${gameId}`);
        return;
      }
      this.schedulerRegistry.deleteInterval(`end-game-if-empty-${gameId}`);
    };

    if (
      this.schedulerRegistry.doesExist(
        'interval',
        `end-game-if-empty-${gameId}`,
      )
    ) {
      return;
    }
    const interval = setInterval(callback, 5000);
    this.schedulerRegistry.addInterval(`end-game-if-empty-${gameId}`, interval);
  }

  async playTrack(gameId: string) {
    const game = await this.gamesService.findOne(gameId);

    if (!game || !game.tracks[0]) {
      this.gameGateway.socketInstance().to(gameId).emit('gameFinished', {});
      this.endGameInterval(gameId);
      this.schedulerRegistry.deleteInterval(`game-${gameId}`);
      return;
    }

    const currentTrack: Track = game.tracks[0];
    this.gameGateway
      .socketInstance()
      .to(gameId)
      .emit('newTrack', { ...currentTrack });
    game.tracks.shift();
    await this.gamesService.update(game.id, {
      tracks: game.tracks,
      currentTrack,
    });
  }

  async removeGame(gameId: string) {
    this.gamesService.delete(gameId);
    this.gameGateway
      .socketInstance()
      .to(gameId)
      .emit('gameDeleted', { id: gameId });
  }
}
