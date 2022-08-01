import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export enum UserStatus {
  OFFLINE = 'offline',
  LOBBY = 'lobby',
  GAME = 'game',
}
@Entity()
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  clientId: string;

  @ApiProperty()
  @Column({ unique: true })
  name: string;

  @Exclude()
  @Column()
  password: string;

  @ApiProperty()
  @Exclude()
  @Column({ default: false })
  isAdmin: boolean;

  @ApiProperty()
  @Column({ default: 0 })
  score: number;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.OFFLINE,
  })
  status: UserStatus;

  @ApiProperty()
  @Column({ nullable: true })
  gameId?: string;
}
