import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

const objectIdString = z.string().min(1);

export const createUserSchema = z.object({
  name: z.string().min(1).max(80),
  avatar: z.union([z.string().url(), z.literal("")]).optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  id: objectIdString,
});

export const expenseBaseSchema = z.object({
  title: z.string().min(1).max(120),
  amount: z.number().positive(),
  category: z.enum(EXPENSE_CATEGORIES),
  paidBy: objectIdString,
  splitBetween: z.array(objectIdString).min(1),
  date: z.coerce.date(),
  notes: z.string().max(2000).optional(),
  billImage: z.string().optional(),
});

export const createExpenseSchema = expenseBaseSchema;

export const updateExpenseSchema = expenseBaseSchema.partial().extend({
  id: objectIdString,
});

export const createSettlementSchema = z.object({
  fromUser: objectIdString,
  toUser: objectIdString,
  amount: z.number().positive(),
  date: z.coerce.date().optional(),
});

export const completeSettlementSchema = z.object({
  id: objectIdString,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
