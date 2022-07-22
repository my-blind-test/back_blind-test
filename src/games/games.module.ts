import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { Game } from './entities/game.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesController } from './games.controller';
import { GameGateway } from './game.gateway';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Game]), AuthModule, UsersModule],
  providers: [GamesService, GameGateway],
  exports: [GamesService],
  controllers: [GamesController],
})
export class GamesModule {}
