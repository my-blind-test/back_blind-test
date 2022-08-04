import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Track } from '../types/track.interface';
import { ConnectedUser } from '../types/connectedUser.interface';

export enum GameStatus {
  WAITING = 'waiting',
  RUNNING = 'running',
}

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
  password?: string;

  @ApiProperty()
  @Column({ default: false })
  isPrivate: boolean;

  @ApiProperty()
  @Column({ default: 0 })
  slots: number;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.WAITING,
  })
  status: GameStatus;

  @Exclude()
  @Column('jsonb', { default: [] })
  tracks: Track[];

  @Exclude()
  @Column('jsonb', { nullable: true })
  currentTrack: Track;

  @Column('jsonb', { default: [] })
  connectedUsers: ConnectedUser[];

  @Column({ nullable: true })
  adminId: string;
}
