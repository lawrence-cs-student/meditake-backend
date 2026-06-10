import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as eventService from '../services/event.service';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['taken', 'missed', 'skipped']),
});

export const getToday = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const events = await eventService.getTodayEvents(req.userId!);
    res.json(events);
  } catch (err) { next(err); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const event = await eventService.updateEventStatus(
      req.params.id as string,
      req.userId!,
      status
    );
    res.json(event);
  } catch (err) { next(err); }
};