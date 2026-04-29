import { z } from 'zod';

// Main schema for adding a content type
export const addContentTypeSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must be at most 255 characters')
    .transform((v) => v.trim()),

  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .transform((v) => v.trim())
    .optional(),

  status: z.enum(['ACTIVE', 'INACTIVE']),

  isEnabledContent: z.boolean().default(true),
  allowMediaUpload: z.boolean().default(true),
  allowTags: z.boolean().default(true),
  metadataSchemaId: z.string().uuid('Invalid Metadata Schema ID').optional().nullable(),
});

// Schema for updating a content type (partial fields)
export const updateContentTypeSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  isEnabledContent: z.boolean().optional(),
  allowMediaUpload: z.boolean().optional(),
  allowTags: z.boolean().optional(),
  metadataSchemaId: z.string().uuid().optional().nullable(),
});
