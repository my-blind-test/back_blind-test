import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { Game } from './entities/game.entity';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
  ) {}

  async create(gameDto: CreateGameDto): Promise<Game> {
    const game = this.gamesRepository.create(gameDto);

    await this.gamesRepository.save(game);
    return game;
  }

  async update(id: number, gameDto: UpdateGameDto): Promise<Game> {
    const game: Game = await this.findOne(id);

    return this.gamesRepository.save({ ...game, ...gameDto });
  }

  findAll(): Promise<Game[]> {
    return this.gamesRepository.find();
  }

  findOne(id: number): Promise<Game> {
    return this.gamesRepository.findOneBy({ id });
  }

  async remove(id: number): Promise<void> {
    await this.gamesRepository.delete(id);
  }
}
