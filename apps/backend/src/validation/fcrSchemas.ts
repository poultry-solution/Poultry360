import { z } from "zod";

export const CloseBatchFcrSchema = z.object({
  endDate: z.string().datetime().optional(),
  finalNotes: z.string().optional(),
  confirmRemainingAsDead: z.boolean().optional().default(false),
});

export type CloseBatchFcrInput = z.infer<typeof CloseBatchFcrSchema>;
