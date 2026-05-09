import { z } from "zod";
import { EXPENSE_CATEGORIES, PRE_BILL_UNITS } from "@/lib/constants";

const preBillUnitEnum = z.enum(PRE_BILL_UNITS);

const objectIdString = z.string().min(1);

export const registerAccountSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(128),
});

export const signupFormSchema = registerAccountSchema
  .extend({
    confirmPassword: z.string().min(1).max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const createUserSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(120),
  avatar: z.union([z.string().url(), z.literal("")]).optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  id: objectIdString,
});

export const updateReminderPreferencesSchema = z.object({
  userId: objectIdString,
  frequency: z.enum(["daily", "weekly"]),
  channels: z.object({
    email: z.boolean(),
    telegram: z.boolean(),
  }),
  quietHours: z
    .object({
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(0).max(23),
    })
    .refine((v) => v.startHour !== v.endHour, {
      message: "Quiet hours start and end cannot be the same",
    }),
});

/** Accepts Cloudinary / any https image URL; trims; empty → undefined (omit). */
const billImageUrlSchema = z.preprocess(
  (v) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t === "" ? undefined : t;
  },
  z
    .string()
    .max(2048)
    .refine(
      (s) => {
        try {
          const u = new URL(s);
          return u.protocol === "https:" || u.protocol === "http:";
        } catch {
          return false;
        }
      },
      { message: "Bill image must be a valid http(s) URL" },
    )
    .optional(),
);

/** For updates: same URL rules, or `null` to remove a stored image. */
const billImageUpdateSchema = z.preprocess(
  (v) => {
    if (v === null) return null;
    if (v === undefined) return undefined;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t === "" ? null : t;
  },
  z
    .union([
      z
        .string()
        .max(2048)
        .refine(
          (s) => {
            try {
              const u = new URL(s);
              return u.protocol === "https:" || u.protocol === "http:";
            } catch {
              return false;
            }
          },
          { message: "Bill image must be a valid http(s) URL" },
        ),
      z.null(),
    ])
    .optional(),
);

const expenseFields = {
  title: z.string().min(1).max(120),
  amount: z.number().positive(),
  category: z.enum(EXPENSE_CATEGORIES),
  paidBy: objectIdString,
  splitEnabled: z.boolean().default(true),
  splitBetween: z.array(objectIdString).default([]),
  date: z.coerce.date(),
  notes: z.string().max(2000).optional(),
  description: z.string().max(2000).optional(),
  billImage: billImageUrlSchema,
};

export const expenseBaseSchema = z
  .object(expenseFields)
  .superRefine((data, ctx) => {
    const description = String(data.description ?? "").trim();
    if (description && !/[A-Za-z]/.test(description)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Description should contain words, not only numbers/symbols",
        path: ["description"],
      });
    }
    if (data.category === "Others" && !String(data.description ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a description for Others",
        path: ["description"],
      });
    }
    if (data.splitEnabled && data.splitBetween.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pick at least one person for the split",
        path: ["splitBetween"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    splitBetween: data.splitEnabled ? data.splitBetween : [data.paidBy],
  }));

export const createExpenseSchema = expenseBaseSchema;

const expenseUpdateFields = {
  ...expenseFields,
  billImage: billImageUpdateSchema,
};

export const updateExpenseSchema = z
  .object(expenseUpdateFields)
  .partial()
  .extend({ id: objectIdString })
  .superRefine((data, ctx) => {
    if (data.description !== undefined) {
      const description = String(data.description).trim();
      if (description && !/[A-Za-z]/.test(description)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Description should contain words, not only numbers/symbols",
          path: ["description"],
        });
      }
    }
    if (data.category === "Others" && data.description !== undefined && !String(data.description).trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a description for Others",
        path: ["description"],
      });
    }
    const splitOn = data.splitEnabled;
    const splits = data.splitBetween;
    if (splitOn === true && splits !== undefined && splits.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pick at least one person for the split",
        path: ["splitBetween"],
      });
    }
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

const preBillItemSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  quantity: z.number().positive(),
  unit: preBillUnitEnum,
  price: z.number().min(0).optional(),
});

export const createPreBillSchema = z.object({
  title: z.string().min(1).max(160).trim(),
  category: z.enum(EXPENSE_CATEGORIES),
  notes: z.string().max(4000).optional(),
  items: z.array(preBillItemSchema).default([]),
});

export const updatePreBillSchema = z.object({
  id: objectIdString,
  title: z.string().min(1).max(160).trim(),
  category: z.enum(EXPENSE_CATEGORIES),
  notes: z.string().max(4000).optional(),
  items: z.array(preBillItemSchema),
});

export const finalizePreBillSchema = z.object({
  id: objectIdString,
});

export const linkPreBillExpenseSchema = z.object({
  preBillId: objectIdString,
  expenseId: objectIdString,
});

export const duplicatePreBillSchema = z.object({
  id: objectIdString,
});

export const deletePreBillSchema = z.object({
  id: objectIdString,
});

export type RegisterAccountInput = z.infer<typeof registerAccountSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupFormInput = z.infer<typeof signupFormSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateReminderPreferencesInput = z.infer<typeof updateReminderPreferencesSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type CreatePreBillInput = z.infer<typeof createPreBillSchema>;
export type UpdatePreBillInput = z.infer<typeof updatePreBillSchema>;
export type FinalizePreBillInput = z.infer<typeof finalizePreBillSchema>;
export type LinkPreBillExpenseInput = z.infer<typeof linkPreBillExpenseSchema>;
export type DeletePreBillInput = z.infer<typeof deletePreBillSchema>;
