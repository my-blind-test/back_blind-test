import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  public password?: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  public slots?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public playlistUrl: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  public adminId?: string;
}
