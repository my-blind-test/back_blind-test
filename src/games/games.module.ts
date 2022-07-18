import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { Game } from './entities/game.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Game])],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
