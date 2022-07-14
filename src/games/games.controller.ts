import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateGameDto } from './dto/create-game.dto';
import { Game } from './entities/game.entity';
import { GamesService } from './games.service';

@Controller('games')
@ApiTags('games')
@UseInterceptors(ClassSerializerInterceptor)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  async create(@Body() createGameDto: CreateGameDto): Promise<void | Game> {
    //TODO : delete
    const game = await this.gamesService.create(createGameDto).catch((err) => {
      if (err.code == '23505') {
        throw new BadRequestException('This game name already exists.');
      }
    });

    return game;
  }

  @Get()
  async findAll(): Promise<Game[]> {
    return await this.gamesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Game> {
    const user = await this.gamesService.findOne(id);

    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }
}
