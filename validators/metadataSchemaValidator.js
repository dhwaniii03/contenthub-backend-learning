import { z } from "zod";

// Main schema for adding a metadata schema
export const addMetadataSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title must be at most 100 characters")
    .transform((v) => v.trim()),

  schemaType: z
    .string()
    .min(1, "Schema Type is required")
    .max(100, "Schema Type must be at most 100 characters")
    .transform((v) => v.trim()),

  // The 'schema' field holds the JSON structure (form fields, etc.)
  schema: z.any().refine((val) => val !== null && typeof val === "object", {
    message: "Schema must be a valid JSON object or array",
  }),

  // The 'seoSchema' field holds the JSON-LD template
  seoSchema: z
    .any()
    .optional()
    .refine(
      (val) => val === undefined || (val !== null && typeof val === "object"),
      {
        message: "SEO Schema must be a valid JSON object or array",
      },
    ),

  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// Schema for updating a metadata schema
export const updateMetadataSchema = z.object({
  title: z.string().optional(),
  schemaType: z.string().optional(),
  schema: z.any().optional(),
  seoSchema: z.any().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
