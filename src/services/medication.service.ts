import { prisma } from '../lib/prisma';
import { logger } from '../lib/pino';
import { AppError } from '../utils/error';

// Helper to convert "HH:mm" string to a Date (uses today's date, but time is what matters)
const timeToDate = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
};

export const listPlans = async (patientId: string) => {
  const plans = await prisma.medicationPlan.findMany({
    where: { patientId },          // correct field name
    include: { schedules: true },
    orderBy: { createdAt: 'desc' },
  });
  logger.info({ patientId }, `Listed ${plans.length} medication plans`);
  return plans;
};

export const getPlan = async (patientId: string, planId: string) => {
  const plan = await prisma.medicationPlan.findFirst({
    where: { id: planId, patientId },
    include: { schedules: true },
  });
  if (!plan) throw new AppError('Medication plan not found', 404);
  return plan;
};

export const createPlan = async (patientId: string, data: {
  name: string;
  dosage?: string;               // still optional in request, but we'll default
  instructions?: string;
  isActive?: boolean;
  schedules?: Array<{
    timeOfDay: string;           // "HH:mm" from frontend
    timezone?: string;
    repeatType: string;
    daysOfWeek?: number[];
    isActive?: boolean;
  }>;
}) => {
  const plan = await prisma.medicationPlan.create({
    data: {
      name: data.name,
      dosage: data.dosage || '',                // required field, default empty string
      instructions: data.instructions,
      isActive: data.isActive ?? true,
      patientId,                                // correct relation scalar
      schedules: {
        create: data.schedules?.map(s => ({
          timeOfDay: timeToDate(s.timeOfDay),   // convert to DateTime
          timezone: s.timezone || 'Asia/Manila',
          repeatType: s.repeatType,
          daysOfWeek: s.daysOfWeek || [],
          isActive: s.isActive ?? true,
        })) || [],
      },
    },
    include: { schedules: true },
  });
  logger.info({ patientId, planId: plan.id }, 'Medication plan created');
  return plan;
};

export const updatePlan = async (patientId: string, planId: string, data: {
  name?: string;
  dosage?: string;
  instructions?: string;
  isActive?: boolean;
  schedules?: Array<{
    timeOfDay: string;
    timezone?: string;
    repeatType: string;
    daysOfWeek?: number[];
    isActive?: boolean;
  }>;
}) => {
  // Ensure plan exists and belongs to user
  await getPlan(patientId, planId);

  // If schedules are provided, replace them
  if (data.schedules) {
    await prisma.medicationSchedule.deleteMany({ where: { medicationPlanId: planId } });
  }

  const updateData: any = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.dosage !== undefined && { dosage: data.dosage }),
    ...(data.instructions !== undefined && { instructions: data.instructions }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
  };

  if (data.schedules) {
    updateData.schedules = {
      create: data.schedules.map(s => ({
        timeOfDay: timeToDate(s.timeOfDay),
        timezone: s.timezone || 'Asia/Manila',
        repeatType: s.repeatType,
        daysOfWeek: s.daysOfWeek || [],
        isActive: s.isActive ?? true,
      })),
    };
  }

  const plan = await prisma.medicationPlan.update({
    where: { id: planId },
    data: updateData,
    include: { schedules: true },
  });
  logger.info({ patientId, planId }, 'Medication plan updated');
  return plan;
};

export const deletePlan = async (patientId: string, planId: string) => {
  await getPlan(patientId, planId);
  await prisma.medicationPlan.delete({ where: { id: planId } });
  logger.info({ patientId, planId }, 'Medication plan deleted');
};