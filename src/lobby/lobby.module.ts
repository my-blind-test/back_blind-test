import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { GamesModule } from 'src/games/games.module';
import { UsersModule } from 'src/users/users.module';
import { LobbyGateway } from './lobby.gateway';

@Module({
  imports: [forwardRef(() => GamesModule), AuthModule, UsersModule],
  providers: [LobbyGateway],
  exports: [LobbyGateway],
})
export class LobbyModule {}
