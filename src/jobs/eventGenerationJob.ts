import { prisma } from '../lib/prisma';
import { logger } from '../lib/pino';
import { scheduleNotification } from '../lib/notificationQueue';
import { Prisma } from '@prisma/client';

export const generateEvents = async () => {
  const now = new Date();
  const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const plans = await prisma.medicationPlan.findMany({
    where: { isActive: true },
    include: {
      schedules: { where: { isActive: true } },
    },
  });

  let created = 0,
    skipped = 0;

  for (const plan of plans) {
    for (const schedule of plan.schedules) {
      const localDate = new Date(schedule.timeOfDay);
      const hours = localDate.getHours();
      const minutes = localDate.getMinutes();

      for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
        const targetLocalDate = new Date(now);
        targetLocalDate.setDate(now.getDate() + dayOffset);
        targetLocalDate.setHours(hours, minutes, 0, 0);
        const scheduledTimeUTC = new Date(targetLocalDate.toISOString());

        if (dayOffset === 1 && (scheduledTimeUTC < now || scheduledTimeUTC > end)) continue;

        // Deduplication check
        const existing = await prisma.medicationEvent.findFirst({
          where: {
            medicationPlanId: plan.id,
            scheduleId: schedule.id,
            scheduledTime: scheduledTimeUTC,
          },
        });
        if (existing) {
          skipped++;
          continue;
        }

        // Create the event
        const event = await prisma.medicationEvent.create({
          data: {
            medicationPlanId: plan.id,
            patientId: plan.patientId,
            scheduleId: schedule.id,
            scheduledTime: scheduledTimeUTC,
            status: 'pending',
          },
        });

        // Build payload as a plain JSON object
        const payload = {
          eventId: event.id,
          medicationName: plan.name,
          dosage: plan.dosage || '',
          scheduledTime: scheduledTimeUTC.toISOString(),
        } as Prisma.JsonObject;

        // Create NotificationJob for this event
        const notificationJob = await prisma.notificationJob.create({
          data: {
            userId: plan.patientId,
            eventId: event.id,
            type: 'reminder',
            payload: payload as Prisma.InputJsonValue,
            scheduledFor: scheduledTimeUTC,
            status: 'pending',
          },
        });

        // Schedule the notification (delayed job in BullMQ)
        await scheduleNotification(notificationJob.id, scheduledTimeUTC);

        created++;
      }
    }
  }

  logger.info(`Event generation: ${created} created, ${skipped} skipped`);
};