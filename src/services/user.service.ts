import { prisma } from '../lib/prisma';

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    const error: any = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return user;
};

export const updateProfile = async (userId: string, data: { name?: string; email?: string }) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true },
  });

  return user;
};