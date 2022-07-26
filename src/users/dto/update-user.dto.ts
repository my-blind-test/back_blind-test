import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { UserStatus } from '../entities/user.entity';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsString()
  @IsOptional()
  public clientId?: string;

  @IsNumber()
  @IsOptional()
  public score?: number;

  @IsEnum(UserStatus)
  @IsOptional()
  public status?: UserStatus;

  @IsString()
  @IsOptional()
  public gameId?: string;
}
