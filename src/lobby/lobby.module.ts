import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { GamesModule } from 'src/games/games.module';
import { UsersModule } from 'src/users/users.module';
import { LobbyGateway } from './lobby.gateway';

@Module({
  imports: [GamesModule, AuthModule, UsersModule],
  providers: [LobbyGateway],
})
export class LobbyModule {}
