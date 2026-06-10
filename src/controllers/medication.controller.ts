import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as medicationService from '../services/medication.service';
import { createMedicationSchema, updateMedicationSchema } from '../types/validation';

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const plans = await medicationService.listPlans(req.userId!);
    res.json(plans);
  } catch (err) { next(err); }
};

export const getOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const plan = await medicationService.getPlan(req.userId!, req.params.id as string);
    res.json(plan);
  } catch (err) { next(err); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createMedicationSchema.parse(req.body);
    const plan = await medicationService.createPlan(req.userId!, data);
    res.status(201).json(plan);
  } catch (err) { next(err); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateMedicationSchema.parse(req.body);
    const plan = await medicationService.updatePlan(req.userId!, req.params.id as string, data);
    res.json(plan);
  } catch (err) { next(err); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await medicationService.deletePlan(req.userId!, req.params.id as string);
    res.status(204).send();
  } catch (err) { next(err); }
};