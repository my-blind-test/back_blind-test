import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findOneByName(username);

    if (user && user.password === password) {
      delete user['password'];
      return user;
    }
    return null;
  }

  async login(user: User) {
    const payload = { username: user.name, sub: user.id };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
