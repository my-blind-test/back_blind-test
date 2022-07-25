import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';
import { ConnectedUser } from '../types/connectedUser.interface';
import { Track } from '../types/track.interface';
import { CreateGameDto } from './create-game.dto';

export class UpdateGameDto extends PartialType(CreateGameDto) {
  @ApiProperty()
  @IsArray()
  @IsOptional()
  public tracks?: Track[];

  @ApiProperty()
  @IsArray()
  @IsOptional()
  public connectedUsers?: ConnectedUser[];
}
