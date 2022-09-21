import { HttpService } from '@nestjs/axios';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { stringify } from 'querystring';
import { LobbyGateway } from 'src/lobby/lobby.gateway';
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
    @Inject(forwardRef(() => LobbyGateway))
    private readonly lobbyGateway: LobbyGateway,
  ) {}

  extractPlaylistId(playlistUrl: string): string {
    return playlistUrl
      .split('/')
      [playlistUrl.split('/').length - 1].split('?')[0];
  }

  async getSpotifyToken(): Promise<string | undefined> {
    const response = await this.httpService.axiosRef
      .post(
        'https://accounts.spotify.com/api/token',
        stringify({
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${process.env.SPOTIFY_ID}:${process.env.SPOTIFY_SECRET}`,
            ).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )
      .catch((err) => {
        console.log(err);
        console.log('Error spotify auth');
        return undefined;
      });

    return response?.data?.access_token;
  }

  async tracksFromPlaylist(playlistUrl: string): Promise<Track[]> {
    const token = await this.getSpotifyToken(); //TODO : ne plus le faire à chaque requête
    const tracks = [];

    if (!token) return tracks;

    const response = await this.httpService.axiosRef
      .get(
        `https://api.spotify.com/v1/playlists/${this.extractPlaylistId(
          playlistUrl,
        )}/tracks`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      .catch((err) => {
        console.log(err);
        console.log('Error spotify request');
      });

    if (!response) {
      return tracks;
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

    return tracks;
  }

  async create(gameDto: CreateGameDto): Promise<Game> {
    const tracks: Track[] = await this.tracksFromPlaylist(gameDto.playlistUrl);

    if (!tracks.length) {
      return null;
    }

    return this.gamesRepository.save(
      this.gamesRepository.create({
        ...gameDto,
        tracks,
        isPrivate: gameDto.password ? true : false,
      }),
    );
  }

  async update(id: string, gameDto: UpdateGameDto): Promise<Game> {
    const game: Game = await this.findOne(id);
    const newGame: Game = await this.gamesRepository.save({
      ...game,
      ...gameDto,
    });

    this.lobbyGateway.emitGameUpdated(newGame);

    return newGame;
  }

  findAll(): Promise<Game[]> {
    return this.gamesRepository.find();
  }

  findOne(id: string): Promise<Game> {
    return this.gamesRepository.findOneBy({ id });
  }

  async delete(id: string): Promise<void> {
    await this.gamesRepository.delete(id);

    this.lobbyGateway.emitGameDeleted(id);
  }
}
