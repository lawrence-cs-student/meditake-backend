import { prisma } from '../lib/prisma';
import { AppError } from '../utils/error';
import { deductFromBatch } from './inventory.service';

export const getTodayEvents = async (patientId: string) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return prisma.medicationEvent.findMany({
    where: {
      patientId,
      scheduledTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      MedicationPlan: {
        select: { name: true, dosage: true },
      },
    },
    orderBy: { scheduledTime: 'asc' },
  });
};


export const updateEventStatus = async (eventId: string, patientId: string, status: string) => {
  const event = await prisma.medicationEvent.findFirst({
    where: { id: eventId, patientId },
  });
  if (!event) throw new AppError('Event not found', 404);

  const updateData: any = { status };
  if (status === 'taken') {
    updateData.takenAt = new Date();
    // Auto‑deduct from inventory when taken
    await deductFromBatch(event.medicationPlanId, patientId, eventId, event.quantityTaken || 1);
  } else if (status === 'missed') {
    updateData.missedAt = new Date();
  }

  return prisma.medicationEvent.update({
    where: { id: eventId },
    data: updateData,
    include: {
      MedicationPlan: { select: { name: true, dosage: true } },
    },
  });
};