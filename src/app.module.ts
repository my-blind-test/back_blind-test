import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'postgres',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'blindtest',
      autoLoadEntities: true,
      synchronize: true, //TODO : REMOVE FOR PROD
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
