import { z } from 'zod';

export const saveSystemTextSchema = z.object({
  name: z.string().min(1, 'Key name is required').regex(/^[a-z0-9_]+$/, 'Key name must be snake_case'),
  pageNameId: z.string().uuid('Invalid Page Name ID').optional(),
  type: z.enum(['TEXT', 'ERROR', 'MEDIA']).default('TEXT'),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
  media: z.any().optional(), // Can be file or UUID
  translations: z.array(z.object({
    languageCode: z.string().min(2).max(10),
    content: z.string().min(1, 'Content is required'),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
  })).optional(),
});

export const updateSystemTextSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_]+$/, 'Key name must be snake_case').optional(),
  pageNameId: z.string().uuid('Invalid Page Name ID').optional(),
  type: z.enum(['TEXT', 'ERROR', 'MEDIA']).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
  media: z.any().optional(),
  translations: z.array(z.object({
    languageCode: z.string().min(2).max(10),
    content: z.string().min(1, 'Content is required'),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
  })).optional(),
});
