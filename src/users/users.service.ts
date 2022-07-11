import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(userDto);

    await this.usersRepository.save(user);
    return user;
  }

  async update(id: number, userDto: UpdateUserDto): Promise<User> {
    const user: User = await this.findOne(id);

    return this.usersRepository.save({ ...user, ...userDto });
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  findOne(id: number): Promise<User> {
    return this.usersRepository.findOneBy({ id });
  }

  findOneByName(name: string): Promise<User> {
    return this.usersRepository.findOneBy({ name });
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
