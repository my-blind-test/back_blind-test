import { Module } from '@nestjs/common';
import { GamesModule } from 'src/games/games.module';
import { LobbyGateway } from './lobby.gateway';

@Module({
  imports: [GamesModule],
  providers: [LobbyGateway],
})
export class LobbyModule {}
