import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn, { maxWait: 5000, timeout: 10000 });
}
