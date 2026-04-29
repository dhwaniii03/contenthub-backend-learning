import { z } from 'zod';

// Schema for a single language entry in the translations array
const translationEntrySchema = z.object({
  languageCode: z
    .string()
    .min(2)
    .max(10)
    .transform((v) => v.toLowerCase()),

  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(255, 'Title must be at most 255 characters')
    .transform((v) => v.trim()),

  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .transform((v) => v.trim())
    .optional(),
});

// Main schema for adding a collection
export const addCollectionSchema = z.object({
  translations: z
    .array(translationEntrySchema)
    .min(1, 'At least one language translation is required'),

  isFeatured: z.boolean().optional().default(false),
  sortOrder: z.enum(['MANUAL', 'LATEST_FIRST']).optional().default('MANUAL'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional().default('PUBLIC'),
  thumbnail: z.any().optional(),
  banner: z.any().optional(),
  contentIds: z.array(z.string().uuid()).optional().default([]),
});

// Schema for updating a collection
export const updateCollectionSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  translations: z.array(translationEntrySchema).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.enum(['MANUAL', 'LATEST_FIRST']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  thumbnail: z.any().optional(),
  banner: z.any().optional(),
  contentIds: z.array(z.string().uuid()).optional(),
});

// Kept for backward compatibility if needed by existing frontend components
export const saveCollectionContentsSchema = z.object({
  contentIds: z
    .array(z.string().uuid("All content IDs must be valid UUIDs"))
    .min(1, "At least one content item must be selected")
    .refine((items) => new Set(items).size === items.length, {
      message: "Duplicate content IDs found in the selection",
    }),
});
