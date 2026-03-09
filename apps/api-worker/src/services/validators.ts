import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  designation: z.string().min(2).max(120),
  department: z.string().min(2).max(120),
  supervisorEmail: z.string().email().optional(),
  timezone: z.string().default("UTC"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const workPlanCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activity: z.string().min(3).max(500),
  expectedOutput: z.string().min(1).max(500),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["planned", "in_progress", "done"]).default("planned"),
  category: z.string().min(1).max(120).default("General"),
});

export const workPlanUpdateSchema = workPlanCreateSchema.partial();

export const activityCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeFromUtc: z.string().datetime(),
  timeToUtc: z.string().datetime(),
  taskDescription: z.string().min(3).max(1_000),
  output: z.string().max(2_000).default(""),
  note: z.string().max(2_000).default(""),
  delivery: z.string().max(500).default(""),
  category: z.string().max(120).default("General"),
  workplanId: z.number().int().positive().nullable().optional(),
});

export const followupCreateSchema = z.object({
  activityId: z.number().int().positive(),
  person: z.string().min(2).max(120),
  followupDate: z.string().datetime(),
  note: z.string().max(1_000).default(""),
  status: z.enum(["pending", "done"]).default("pending"),
});

export const followupStatusUpdateSchema = z.object({
  status: z.enum(["pending", "done"]),
});
