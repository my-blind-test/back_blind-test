import { forwardRef, Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { Game } from './entities/game.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesGateway } from './games.gateway';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { HttpModule } from '@nestjs/axios';
import { LobbyModule } from 'src/lobby/lobby.module';
import { GamesInterval } from './games.interval';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game]),
    HttpModule,
    AuthModule,
    UsersModule,
    forwardRef(() => LobbyModule),
  ],
  providers: [GamesService, GamesGateway, GamesInterval],
  exports: [GamesService],
})
export class GamesModule {}
