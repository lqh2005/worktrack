import { z } from "zod";
import {
  ISSUE_PRIORITIES,
  ISSUE_SORT_FIELDS,
  ISSUE_STATUSES,
  STORY_POINTS,
  type StoryPoint,
} from "@/lib/constants";
import {
  booleanStringSchema,
  csvEnum,
  dateInputSchema,
  idSchema,
  paginationSchema,
} from "./common";

export const issueStatusSchema = z.enum(ISSUE_STATUSES, {
  errorMap: () => ({ message: `Status must be one of: ${ISSUE_STATUSES.join(", ")}` }),
});

export const issuePrioritySchema = z.enum(ISSUE_PRIORITIES, {
  errorMap: () => ({ message: `Priority must be one of: ${ISSUE_PRIORITIES.join(", ")}` }),
});

export const storyPointsSchema = z
  .number({ invalid_type_error: "Story points must be a number" })
  .int()
  .refine((value): value is StoryPoint => (STORY_POINTS as readonly number[]).includes(value), {
    message: `Story points must be one of: ${STORY_POINTS.join(", ")}`,
  });

const titleSchema = z
  .string({ required_error: "Title is required" })
  .trim()
  .min(3, "Title must be at least 3 characters")
  .max(200, "Title must be at most 200 characters");

const descriptionSchema = z
  .string()
  .trim()
  .max(5000, "Description must be at most 5000 characters")
  .nullish()
  .transform((value) => (value ? value : null));

export const createIssueSchema = z.object({
  projectId: idSchema,
  title: titleSchema,
  description: descriptionSchema,
  status: issueStatusSchema.default("TODO"),
  priority: issuePrioritySchema.default("MEDIUM"),
  storyPoints: storyPointsSchema.default(1),
  dueDate: dateInputSchema.nullish().transform((value) => value ?? null),
});

export const updateIssueSchema = z
  .object({
    title: titleSchema,
    description: z
      .string()
      .trim()
      .max(5000, "Description must be at most 5000 characters")
      .nullable()
      .transform((value) => (value ? value : null)),
    status: issueStatusSchema,
    priority: issuePrioritySchema,
    storyPoints: storyPointsSchema,
    dueDate: dateInputSchema.nullable(),
  })
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
  });

export const statusTransitionSchema = z.object({
  status: issueStatusSchema,
});

export const issueListQuerySchema = paginationSchema.extend({
  projectId: idSchema.optional(),
  status: csvEnum(ISSUE_STATUSES).optional(),
  priority: csvEnum(ISSUE_PRIORITIES).optional(),
  q: z
    .string()
    .trim()
    .max(100, "Search query is too long")
    .optional()
    .transform((value) => (value ? value : undefined)),
  overdue: booleanStringSchema.optional(),
  sortBy: z.enum(ISSUE_SORT_FIELDS).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const boardQuerySchema = z.object({
  priority: csvEnum(ISSUE_PRIORITIES).optional(),
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const activityQuerySchema = z.object({
  projectId: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type IssueListQuery = z.infer<typeof issueListQuerySchema>;
export type BoardQuery = z.infer<typeof boardQuerySchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
