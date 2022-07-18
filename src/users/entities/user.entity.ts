import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Game } from 'src/games/entities/game.entity';

@Entity()
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ unique: true })
  name: string;

  @ApiProperty()
  @Exclude()
  @Column({ default: false })
  isAdmin: boolean;

  @Exclude()
  @Column()
  password: string;

  @OneToMany(() => Game, (game) => game.user)
  games: Game[];
}
