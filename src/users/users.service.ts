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
    return this.usersRepository.save(this.usersRepository.create(userDto));
  }

  async update(id: string, userDto: UpdateUserDto): Promise<User> {
    const user: User = await this.findOne(id);

    return this.usersRepository.save({ ...user, ...userDto });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    return this.usersRepository.findOneBy({ id });
  }

  async findOneByName(name: string): Promise<User> {
    return this.usersRepository.findOneBy({ name });
  }

  async delete(id: string): Promise<void> {
    this.usersRepository.delete(id);
  }
}
