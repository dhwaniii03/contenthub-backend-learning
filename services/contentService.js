import prisma from "../utils/prismaClient.js";
import { ensureUniqueSlug } from "../utils/slugHelper.js";

/**
 * Service to handle content duplication
 */
export const duplicateContentService = async (contentId, userId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch the original content with its collection links
    const originalContent = await tx.content.findUnique({
      where: { id: contentId, isDeleted: false },
      include: {
        collections: true,
      },
    });

    if (!originalContent) {
      throw new Error("error_not_found");
    }

    // 2. Prepare the base slug and ensure uniqueness
    const baseSlug = `${originalContent.slug}-copy`;
    const uniqueSlug = await ensureUniqueSlug(baseSlug, tx.content);

    // 3. Create the new content record
    const duplicatedContent = await tx.content.create({
      data: {
        ownerType: originalContent.ownerType,
        ownerId: userId, // Set owner to current user
        contentTypeId: originalContent.contentTypeId,
        content: JSON.parse(JSON.stringify(originalContent.content)), // Deep copy JSON
        slug: uniqueSlug,
        tags: [...originalContent.tags],
        visibility: originalContent.visibility,
        status: "DRAFT", // Always set to DRAFT
        isDeleted: false,
        createdById: userId,
        updatedById: userId,
        collections: {
          create: originalContent.collections.map((rel) => ({
            collectionId: rel.collectionId,
            sortOrder: rel.sortOrder,
          })),
        },
      },
      include: {
        collections: {
          select: {
            collection: {
              select: { id: true, title: true },
            },
          },
        },
        contentType: {
          select: { name: true },
        },
      },
    });

    return duplicatedContent;
  });
};
