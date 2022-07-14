import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { Game } from './entities/game.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesController } from './games.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Game])],
  providers: [GamesService],
  exports: [GamesService],
  controllers: [GamesController],
})
export class GamesModule {}
