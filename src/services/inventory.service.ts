import { prisma } from '../lib/prisma';
import { logger } from '../lib/pino';
import { AppError } from '../utils/error';

// Get inventory summary for all medications of a patient
export const getInventorySummary = async (patientId: string) => {
  const plans = await prisma.medicationPlan.findMany({
    where: { patientId, isActive: true },
    include: {
      MedicationBatch: {
        where: { remainingQuantity: { gt: 0 } },
        orderBy: { receivedAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return plans.map(plan => {
    const totalRemaining = plan.MedicationBatch.reduce(
      (sum, batch) => sum + batch.remainingQuantity, 0
    );
    const latestBatch = plan.MedicationBatch[0] || null;
    const isLow = totalRemaining < 10; // Threshold for low stock warning

    return {
      medicationPlanId: plan.id,
      medicationName: plan.name,
      dosage: plan.dosage,
      totalRemaining,
      isLow,
      batches: plan.MedicationBatch.map(batch => ({
        id: batch.id,
        remainingQuantity: batch.remainingQuantity,
        quantityReceived: batch.quantityReceived,
        receivedAt: batch.receivedAt,
        expiryDate: batch.expiryDate,
      })),
    };
  });
};

// Create a new batch (refill)
export const createBatch = async (
  patientId: string,
  medicationPlanId: string,
  data: { quantityReceived: number; expiryDate?: string }
) => {
  // Verify the medication plan belongs to the patient
  const plan = await prisma.medicationPlan.findFirst({
    where: { id: medicationPlanId, patientId },
  });
  if (!plan) throw new AppError('Medication plan not found', 404);

  const batch = await prisma.medicationBatch.create({
    data: {
      medicationPlanId,
      quantityReceived: data.quantityReceived,
      remainingQuantity: data.quantityReceived,
      receivedAt: new Date(),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
    },
  });

  logger.info({ patientId, medicationPlanId, batchId: batch.id }, 'Inventory batch created');
  return batch;
};

// Deduct from active batch when an event is marked as taken
export const deductFromBatch = async (
  medicationPlanId: string,
  patientId: string,
  eventId: string,
  quantity: number = 1
) => {
  // Find the batch with the most remaining quantity (FIFO-ish)
  const batch = await prisma.medicationBatch.findFirst({
    where: {
      medicationPlanId,
      remainingQuantity: { gt: 0 },
    },
    orderBy: { receivedAt: 'asc' },
  });

  if (!batch) {
    logger.warn({ medicationPlanId, eventId }, 'No active batch with remaining quantity');
    return null;
  }

  // Deduct and create transaction in a single transaction
  const [updatedBatch, transaction] = await prisma.$transaction([
    prisma.medicationBatch.update({
      where: { id: batch.id },
      data: {
        remainingQuantity: {
          decrement: quantity,
        },
      },
    }),
    prisma.inventoryTransaction.create({
      data: {
        batchId: batch.id,
        eventId,
        changeAmount: -quantity,
        reason: 'taken',
      },
    }),
  ]);

  // Check for low stock after deduction
  if (updatedBatch.remainingQuantity < 10) {
    logger.warn(
      { medicationPlanId, batchId: batch.id, remaining: updatedBatch.remainingQuantity },
      'Low stock warning'
    );
  }

  logger.info(
    { medicationPlanId, batchId: batch.id, eventId, quantity },
    'Deducted from inventory'
  );

  return updatedBatch;
};

// Get transaction history for a medication plan
export const getTransactionHistory = async (
  patientId: string,
  medicationPlanId: string
) => {
  const plan = await prisma.medicationPlan.findFirst({
    where: { id: medicationPlanId, patientId },
  });
  if (!plan) throw new AppError('Medication plan not found', 404);

  return prisma.inventoryTransaction.findMany({
    where: {
      MedicationBatch: { medicationPlanId },
    },
    include: {
      MedicationBatch: {
        select: { id: true, quantityReceived: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit to last 50 transactions
  });
};