import { z } from "zod";
import { ValidationError } from "./errors";

/** Parses input with a zod schema, throwing a friendly ValidationError. */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join(".");
    throw new ValidationError(
      field ? `${field}: ${issue.message}` : (issue?.message ?? "Invalid input"),
    );
  }
  return result.data;
}

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Give it a title.")
  .max(160, "Keep the title under 160 characters.");
export const uuidSchema = z.string().uuid();
