import { z } from "zod";

const projectBaseSchema = z.object({
  name: z
    .string({ required_error: "Project name is required" })
    .trim()
    .min(2, "Project name must be at least 2 characters")
    .max(60, "Project name must be at most 60 characters"),
  key: z
    .string({ required_error: "Project key is required" })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,5}$/, "Key must be 2-6 uppercase letters or digits"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .nullish()
    .transform((value) => (value ? value : null)),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex code")
    .optional(),
});

export const createProjectSchema = projectBaseSchema;

export const updateProjectSchema = projectBaseSchema
  .omit({ key: true })
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
  });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
