import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserStatus } from './entities/user.entity';

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

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  findAllSortedByScore(limit?: number): Promise<User[]> {
    return this.usersRepository.find({
      order: {
        score: 'ASC',
      },
      take: limit,
    });
  }

  findAllFromStatus(status: UserStatus): Promise<User[]> {
    return this.usersRepository.find({
      where: {
        status,
      },
    });
  }

  findOneFromClientId(clientId: string): Promise<User> {
    return this.usersRepository.findOneBy({ clientId });
  }

  findOne(id: string): Promise<User> {
    return this.usersRepository.findOneBy({ id });
  }

  findOneByName(name: string): Promise<User> {
    return this.usersRepository.findOneBy({ name });
  }

  delete(id: string): void {
    this.usersRepository.delete(id);
  }
}
