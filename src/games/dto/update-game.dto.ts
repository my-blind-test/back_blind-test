import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsObject, IsOptional } from 'class-validator';
import { GameStatus } from '../entities/game.entity';
import { ConnectedUser } from '../types/connectedUser.interface';
import { Track } from '../types/track.interface';
import { CreateGameDto } from './create-game.dto';

export class UpdateGameDto extends PartialType(CreateGameDto) {
  @IsEnum(GameStatus)
  @IsOptional()
  public status?: GameStatus;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  public tracks?: Track[];

  @ApiProperty()
  @IsObject()
  @IsOptional()
  public currentTrack?: Track;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  public connectedUsers?: ConnectedUser[];
}
