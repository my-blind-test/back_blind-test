import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User, UserStatus } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const user: User = {
  id: 'ef01511a-4e8f-4124-9ef3-4f66b7395c11',
  clientId: 'P3G1E5XBs8BPbwzaAAAB',
  name: 'name',
  password: 'password',
  score: 0,
  status: UserStatus.OFFLINE,
  gameId: null,
  isAdmin: false,
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useFactory: () => ({
            findOne: jest.fn(() => user),
            update: jest.fn(() => user),
            delete: jest.fn(),
          }),
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findOne', () => {
    it('should call the appropriate service method', async () => {
      controller.findOne(user.id);

      expect(service.findOne).toHaveBeenCalled();
      expect(service.findOne).toHaveBeenCalledWith(user.id);
    });

    describe('user found', () => {
      it('should return the value returned by the service method', async () => {
        expect(await controller.findOne(user.id)).toBe(user);
      });
    });

    describe('user not found', () => {
      it('should throw a NotFoundException', async () => {
        jest.spyOn(service, 'findOne').mockReturnValueOnce(null);

        await expect(controller.findOne(user.id)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });
});
