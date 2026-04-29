import { z } from "zod";

export const addContentSchema = z.object({
  contentTypeId: z.string(),
  collectionIds: z.any().optional(),
  content: z.any(),
  tags: z.any().optional(),
  status: z.any().optional(),
  visibility: z.any().optional(),
});

export const updateContentSchema = z.object({
  contentTypeId: z.string().optional(),
  collectionIds: z.any().optional(),
  content: z.any().optional(),
  tags: z.any().optional(),
  status: z.any().optional(),
  visibility: z.any().optional(),
});

export const contentSelectionSearchSchema = z.object({
  collectionId: z.string().uuid("Invalid Collection ID").optional(),
  search: z.string().optional(),
  page: z
    .preprocess((val) => parseInt(val, 10), z.number().min(1))
    .optional()
    .default(1),
  limit: z
    .preprocess((val) => parseInt(val, 10), z.number().min(1).max(100))
    .optional()
    .default(10),
});

export const getAllContentsQuerySchema = z.object({
  search: z.string().optional(),
  contentTypeId: z.string().uuid("Invalid Content Type ID").optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  collectionId: z.string().uuid("Invalid Collection ID").optional(),
  languageCode: z.string().optional(),
  page: z
    .preprocess((val) => parseInt(val, 10), z.number().min(1))
    .optional()
    .default(1),
  limit: z
    .preprocess((val) => parseInt(val, 10), z.number().min(1).max(100))
    .optional()
    .default(10),
});
