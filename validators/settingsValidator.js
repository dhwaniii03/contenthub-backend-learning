import { z } from 'zod';

export const generalSettingsSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  siteDescription: z.string().max(500).optional(),
  contactEmail: z.string().email("Invalid email format").optional(),
  logo: z.any().optional(),
  favicon: z.any().optional(),
});

export const seoSettingsSchema = z.object({
  metaTitle: z.string().min(1).max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  keywords: z.array(z.string()).optional(),
});

export const preferencesSchema = z.record(z.string(), z.boolean());
