import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as inventoryService from '../services/inventory.service';
import { z } from 'zod';

const createBatchSchema = z.object({
  quantityReceived: z.number().int().min(1),
  expiryDate: z.string().optional(),
});

export const getInventory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const summary = await inventoryService.getInventorySummary(req.userId!);
    res.json(summary);
  } catch (err) { next(err); }
};

export const addBatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { medicationPlanId } = req.params;
    const data = createBatchSchema.parse(req.body);
    const batch = await inventoryService.createBatch(req.userId!, medicationPlanId as string, data);
    res.status(201).json(batch);
  } catch (err) { next(err); }
};

export const getTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { medicationPlanId } = req.params;
    const transactions = await inventoryService.getTransactionHistory(
      req.userId!,
      medicationPlanId as string
    );
    res.json(transactions);
  } catch (err) { next(err); }
};