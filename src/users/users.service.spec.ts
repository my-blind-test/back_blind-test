import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { UsersService } from './users.service';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  create: jest.fn((user) => user),
  save: jest.fn((user) => Promise.resolve(user)),
});

describe('UsersService', () => {
  let service: UsersService;
  let repository: MockRepository;

  const user: User = {
    id: 'ef01511a-4e8f-4124-9ef3-4f66b7395c11',
    clientId: 'P3G1E5XBs8BPbwzaAAAB',
    name: 'name',
    password: 'password',
    score: 0,
    status: UserStatus.OFFLINE,
    isAdmin: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<MockRepository>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call the appropriate service method', async () => {
      await service.create(user);

      expect(repository.create).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(user);
      expect(repository.save).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(user);
    });

    describe('with a valid user dto', () => {
      it('should return the value returned by the repository', async () => {
        expect(await service.create(user)).toBe(user);
      });
    });

    describe('with an already existing user', () => {
      beforeEach(() => {
        repository.save.mockRejectedValueOnce(new Error());
      });

      it('should throw an error', async () => {
        await expect(service.create(user)).rejects.toThrow();
      });
    });
  });
});
