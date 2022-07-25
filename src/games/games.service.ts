import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { Game } from './entities/game.entity';
import { Track } from './types/track.interface';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    private readonly httpService: HttpService,
  ) {
    // const response = this.httpService.axiosRef
    //   .post(
    //     `https://api.spotify.com/v1/playlists/${this.extractPlaylistId(
    //       playlistUrl,
    //     )}/tracks`,
    //     {
    //       headers: { Authorization: `Bearer ${process.env.SPOTIFY_TOKEN}` },
    //     },
    //   )
    //   .catch((err) => {
    //     console.log('Error spotify request');
    //     console.log(err);
    //   });
    // if (!response) {
    //   return [];
    // }
  }

  extractPlaylistId(playlistUrl: string): string {
    return playlistUrl
      .split('/')
      [playlistUrl.split('/').length - 1].split('?')[0];
  }

  async tracksFromPlaylist(playlistUrl: string): Promise<Track[]> {
    const tracks = [];
    const response = await this.httpService.axiosRef
      .get(
        `https://api.spotify.com/v1/playlists/${this.extractPlaylistId(
          playlistUrl,
        )}/tracks`,
        {
          headers: { Authorization: `Bearer ${process.env.SPOTIFY_TOKEN}` },
        },
      )
      .catch((err) => {
        console.log(err);
        console.log('Error spotify request');
      });

    console.log(`Bearer ${process.env.SPOTIFY_TOKEN}`);
    if (!response) {
      return [];
    }

    response.data.items.forEach(
      (item: any) =>
        item.track.preview_url &&
        tracks.push({
          song: item.track.name,
          artist: item.track.artists[0].name,
          url: item.track.preview_url,
        }),
    );

    console.log(tracks);

    return tracks;
  }

  async create(gameDto: CreateGameDto, user: User): Promise<Game> {
    const tracks: Track[] = await this.tracksFromPlaylist(gameDto.playlistUrl);

    return this.gamesRepository.save(
      this.gamesRepository.create({
        name: gameDto.name,
        password: gameDto.password,
        user,
        tracks,
      }),
    );
  }

  async update(game: Game, gameDto: UpdateGameDto): Promise<Game> {
    return this.gamesRepository.save({ ...game, ...gameDto });
  }

  findAll(): Promise<Game[]> {
    return this.gamesRepository.find();
  }

  findOne(id: string): Promise<Game> {
    return this.gamesRepository.findOneBy({ id });
  }

  async delete(id: string): Promise<void> {
    await this.gamesRepository.delete(id);
  }
}
