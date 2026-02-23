import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SequencesService } from './sequences.service';
import { PrismaService } from '../prisma/prisma.service';

const makeSequence = (overrides = {}) => ({
  id: 1,
  branchId: 1,
  key: 'invoice',
  prefix: 'INV-',
  nextNumber: 1,
  padding: 6,
  ...overrides,
});

const mockPrisma = {
  sequence: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

describe('SequencesService', () => {
  let service: SequencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SequencesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SequencesService>(SequencesService);
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // getSequences
  // ──────────────────────────────────────────────
  describe('getSequences', () => {
    it('should return paginated sequences', async () => {
      mockPrisma.sequence.findMany.mockResolvedValue([makeSequence()]);
      mockPrisma.sequence.count.mockResolvedValue(1);

      const result = await service.getSequences({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].prefix).toBe('INV-');
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1 });
    });

    it('should filter by branchId', async () => {
      mockPrisma.sequence.findMany.mockResolvedValue([]);
      mockPrisma.sequence.count.mockResolvedValue(0);

      await service.getSequences({ page: 1, limit: 10, branchId: 2 });

      expect(mockPrisma.sequence.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { branchId: 2 } }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // updateSequence
  // ──────────────────────────────────────────────
  describe('updateSequence', () => {
    it('should update a sequence', async () => {
      mockPrisma.sequence.findUnique.mockResolvedValue(makeSequence());
      mockPrisma.sequence.update.mockResolvedValue(
        makeSequence({ prefix: 'FAC-', nextNumber: 100 }),
      );

      const result = await service.updateSequence(1, {
        prefix: 'FAC-',
        nextNumber: 100,
      });

      expect(result.data.prefix).toBe('FAC-');
      expect(result.data.nextNumber).toBe(100);
    });

    it('should throw NotFoundException if sequence does not exist', async () => {
      mockPrisma.sequence.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSequence(999, { prefix: 'X-' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // getNextNumber — transactional folio generation
  // ──────────────────────────────────────────────
  describe('getNextNumber', () => {
    it('should return formatted folio and increment', async () => {
      // The $transaction receives a callback; we simulate the inner tx
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<string>) => {
          const fakeTx = {
            $queryRaw: jest
              .fn()
              .mockResolvedValue([
                { id: 1, prefix: 'INV-', next_number: 42, padding: 6 },
              ]),
            $executeRaw: jest.fn().mockResolvedValue(1),
          };
          return cb(fakeTx);
        },
      );

      const folio = await service.getNextNumber(1, 'invoice');

      expect(folio).toBe('INV-000042');
    });

    it('should throw NotFoundException when sequence does not exist', async () => {
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<string>) => {
          const fakeTx = {
            $queryRaw: jest.fn().mockResolvedValue([]), // empty = not found
            $executeRaw: jest.fn(),
          };
          return cb(fakeTx);
        },
      );

      await expect(service.getNextNumber(99, 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should pad numbers correctly', async () => {
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<string>) => {
          const fakeTx = {
            $queryRaw: jest
              .fn()
              .mockResolvedValue([
                { id: 1, prefix: 'REC-', next_number: 7, padding: 4 },
              ]),
            $executeRaw: jest.fn().mockResolvedValue(1),
          };
          return cb(fakeTx);
        },
      );

      const folio = await service.getNextNumber(1, 'receipt');

      expect(folio).toBe('REC-0007');
    });
  });
});
