import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { User } from 'src/users/entities/user.entity';

@Entity()
export class Game {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ unique: true })
  name: string;

  @ApiProperty()
  @Exclude()
  @Column({ nullable: true })
  password: string;

  @ApiProperty()
  @Column()
  playlistUrl: string;

  @ManyToOne(() => User, (user) => user.games)
  user: User; //TODO : est-ce bien niveau perf de d'avoir l'user et pas juste son ID ?
}
