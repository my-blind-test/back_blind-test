import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Req,
  NotFoundException,
  HttpCode,
  BadRequestException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/metadata';
import { Request } from 'express';
import { User } from './entities/user.entity';

@Controller('users')
@ApiTags('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<void | User> {
    //TODO : delete
    const user = await this.usersService.create(createUserDto).catch((err) => {
      if (err.code == '23505') {
        throw new BadRequestException('This username already exists.');
      }
    });

    return user;
  }

  @Get()
  async findAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

  @Get('/me')
  async findme(@Req() req: Request): Promise<User> {
    return await this.usersService.findOne(req.user['userId']);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ): Promise<User> {
    const user: User = await this.usersService.findOne(req.user['userId']);

    if (!user || (!user.isAdmin && req.user['userId'] != id)) {
      throw new NotFoundException();
    }

    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ): Promise<void> {
    const user: User = await this.usersService.findOne(req.user['userId']);

    if (!user || (!user.isAdmin && req.user['userId'] != id)) {
      throw new NotFoundException();
    }
    await this.usersService.delete(id);
  }
}
