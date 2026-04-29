import { z } from 'zod';

export const languageSchema = z.object({
  languageName: z.string().min(2, "Language Name is required").max(50),
  languageCode: z.string().length(2, "Language Code must be exactly 2 characters (e.g., 'en')"),
  countryCode: z.string().length(2, "Country Code must be exactly 2 characters (e.g., 'US')"),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
