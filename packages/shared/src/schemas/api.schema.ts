import { z } from 'zod';

// Standard API envelope for all responses
export const ApiResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.nullable(),
    meta: z
      .object({
        page: z.number().optional(),
        perPage: z.number().optional(),
        total: z.number().optional(),
      })
      .optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
      })
      .nullable(),
  });

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

export const JobStatusResponse = z.object({
  jobId: z.string(),
  status: z.enum(['queued', 'running', 'complete', 'failed', 'retrying']),
  progress: z.number().min(0).max(100).nullable(),
  resultSummary: z.record(z.unknown()).nullable(),
  errorMessage: z.string().nullable(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});
export type JobStatusResponse = z.infer<typeof JobStatusResponse>;
