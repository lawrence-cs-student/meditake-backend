import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const medicationScheduleSchema = z.object({
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:mm"),
  timezone: z.string().optional().default("Asia/Manila"),
  repeatType: z.enum(["daily", "weekly", "custom"]),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  isActive: z.boolean().optional().default(true),
});

export const createMedicationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dosage: z.string().optional(),
  instructions: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  schedules: z.array(medicationScheduleSchema).optional().default([]),
});

export const updateMedicationSchema = z.object({
  name: z.string().min(1).optional(),
  dosage: z.string().optional(),
  instructions: z.string().optional(),
  isActive: z.boolean().optional(),
  schedules: z.array(medicationScheduleSchema).optional(),
});