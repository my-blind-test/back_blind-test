import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { LobbyModule } from './lobby/lobby.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'blindtest',
      autoLoadEntities: true,
      synchronize: true, //TODO : REMOVE FOR PROD
    }),
    UsersModule,
    GamesModule,
    LobbyModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AuthModule,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
