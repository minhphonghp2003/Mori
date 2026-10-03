import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  image: z.string().url().nullable().optional(),
  age: z.number().min(1).max(150).optional(),
  genderId: z.number().min(1).optional(),
  bio: z.string().max(150).nullable().optional(),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
