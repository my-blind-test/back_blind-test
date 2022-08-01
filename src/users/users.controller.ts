import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Req,
  NotFoundException,
  HttpCode,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from './entities/user.entity';

@Controller('users')
@ApiTags('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get('/me')
  async findMe(@Req() req: Request): Promise<User> {
    return await this.usersService.findOne(req.user['userId']);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<User> {
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
    console.log(this.usersService.delete(id));
  }
}
