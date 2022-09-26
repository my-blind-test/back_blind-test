import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User, UserStatus } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { createRequest } from 'node-mocks-http';

const user: User = {
  id: 'ef01511a-4e8f-4124-9ef3-4f66b7395c11',
  clientId: 'P3G1E5XBs8BPbwzaAAAB',
  name: 'name',
  password: 'password',
  score: 0,
  status: UserStatus.OFFLINE,
  isAdmin: false,
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;
  const req = createRequest();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useFactory: () => ({
            findOne: jest.fn((userId) =>
              Promise.resolve(userId === user.id ? user : null),
            ),
            findAllSortedByScore: jest.fn(() => Promise.resolve([user])),
            update: jest.fn(() => Promise.resolve(user)),
            delete: jest.fn(),
          }),
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    req.user = undefined;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findOne', () => {
    it('should call the appropriate service method', async () => {
      await controller.findOne(user.id);

      expect(service.findOne).toHaveBeenCalled();
      expect(service.findOne).toHaveBeenCalledWith(user.id);
    });

    describe('user found', () => {
      it('should return the value returned by the service', async () => {
        expect(await controller.findOne(user.id)).toBe(user);
      });
    });

    describe('user not found', () => {
      it('should throw a NotFoundException', async () => {
        await expect(controller.findOne('123')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('findMe', () => {
    beforeEach(() => {
      req.user = { userId: user.id };
    });

    it('should call the appropriate service method', async () => {
      await controller.findMe(req);

      expect(service.findOne).toHaveBeenCalled();
      expect(service.findOne).toHaveBeenCalledWith(user.id);
    });

    describe('with a valid user connected', () => {
      it('should return the value returned by the service', async () => {
        expect(await controller.findMe(req)).toBe(user);
      });
    });

    describe('with an invalid user connected', () => {
      beforeEach(() => {
        req.user = { userId: 123 };
      });

      it('should throw a NotFoundException', async () => {
        await expect(controller.findMe(req)).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('podium', () => {
    it('should call the appropriate service method', async () => {
      await controller.podium(2);

      expect(service.findAllSortedByScore).toHaveBeenCalled();
      expect(service.findAllSortedByScore).toHaveBeenCalledWith(2);
    });

    describe('with a positive limit', () => {
      it('should set the limit', async () => {
        expect(await controller.podium(1)).toStrictEqual([user]);

        expect(service.findAllSortedByScore).toHaveBeenCalledWith(1);
      });
    });

    describe('without limit', () => {
      it('should set the limit to 10', async () => {
        expect(await controller.podium()).toStrictEqual([user]);

        expect(service.findAllSortedByScore).toHaveBeenCalledWith(10);
      });
    });

    describe('with a not positive limit', () => {
      it('should throw a BadRequestException', async () => {
        await expect(controller.podium(-1)).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      req.user = { userId: user.id };
    });

    it('should call the appropriate service method', async () => {
      await controller.update(user.id, {}, req);

      expect(service.update).toHaveBeenCalled();
      expect(service.update).toHaveBeenCalledWith(user.id, {});
    });

    describe('with a valid user id', () => {
      it('should return the value returned by the service', async () => {
        expect(await controller.update(user.id, {}, req)).toBe(user);
      });
    });

    describe('with an invalid user id', () => {
      it('should throw a NotFoundException', async () => {
        await expect(controller.update('123', {}, req)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('with connected user different then the requested one', () => {
      describe('with an admin connected', () => {
        it('should return the value returned by the service', async () => {
          expect(await controller.update(user.id, {}, req)).toBe(user);
        });
      });
      describe('with a regular user connected', () => {
        it('should throw a NotFoundException', async () => {
          await expect(controller.update('123', {}, req)).rejects.toThrow(
            NotFoundException,
          );
        });
      });
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      req.user = { userId: user.id };
    });

    it('should call the appropriate service method', async () => {
      await controller.delete(user.id, req);

      expect(service.delete).toHaveBeenCalled();
      expect(service.delete).toHaveBeenCalledWith(user.id);
    });

    describe('with an invalid user id', () => {
      it('should throw a NotFoundException', async () => {
        await expect(controller.delete('123', req)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('with connected user different then the requested one', () => {
      describe('with an admin connected', () => {
        it('should call the appropriate service method', async () => {
          await controller.delete(user.id, req);

          expect(service.delete).toHaveBeenCalledWith(user.id);
        });
      });
      describe('with a regular user connected', () => {
        it('should throw a NotFoundException', async () => {
          await expect(controller.delete('123', req)).rejects.toThrow(
            NotFoundException,
          );
        });
      });
    });
  });
});
