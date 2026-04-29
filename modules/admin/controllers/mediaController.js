import prisma from '../../../utils/prismaClient.js';
import { successResponseWithData, ErrorResponse, unsuccessResponseWithoutData, notFoundResponse } from '../../../utils/apiResponse.js';
import mediaService from '../../../utils/mediaService.js';
import path from 'path';
import eventBus from '../../../utils/eventBus.js';


export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) return await unsuccessResponseWithoutData(res, 'error_bad_request');

    const { name, tags, altText, caption } = req.body;
    const tagList = typeof tags === 'string'
      ? tags.split(/[,\s]+/).map(t => t.trim()).filter(Boolean)
      : (Array.isArray(tags) ? tags : []);

    const mediaId = await mediaService.registerMedia(req.file, { name, tags: tagList, alternativeText: altText, caption });
    const media = await prisma.media.findUnique({ where: { id: mediaId } });

    // Audit Context
    res.locals.afterData = media;
    res.locals.entityId = media.id;
    res.locals.entityType = 'Media';

    eventBus.emit("data:created", {
      module: "MEDIA",
      title: "Media Uploaded",
      message: `A new media file "${media.name || media.fileName}" was uploaded.`,
      userId: req.user.id,
      data: { id: media.id, url: media.url }
    });

    return await successResponseWithData(res, 'success_created', mediaService.withFormattedSize(media));

  } catch (error) {
    console.error('Upload media error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

export const getMediaList = async (req, res) => {
  const { search, tag, type, sort = 'newest', page = 1, limit = 20 } = req.query;
  try {
    const limitNumber = Math.min(parseInt(limit, 10) || 20, 100);
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNumber - 1) * limitNumber;
    const where = { isDeleted: false };

    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { fileName: { contains: search, mode: 'insensitive' } }, { tags: { has: search } }];
    if (tag) where.tags = { has: tag };
    if (type) {
      const typeLower = type.toLowerCase();
      if (typeLower === 'images') where.fileType = 'image';
      else if (typeLower === 'videos') where.fileType = 'video';
      else if (typeLower === 'documents') where.fileType = { in: ['application', 'text'] };
      else where.fileType = typeLower;
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sort === 'size(small)') orderBy = { size: 'asc' };
    else if (sort === 'size(large)') orderBy = { size: 'desc' };

    const [totalCount, results, stats] = await Promise.all([
      prisma.media.count({ where }),
      prisma.media.findMany({ where, orderBy, skip, take: limitNumber }),
      Promise.all([
        prisma.media.count({ where: { isDeleted: false } }),
        prisma.media.count({ where: { isDeleted: false, fileType: 'image' } }),
        prisma.media.count({ where: { isDeleted: false, fileType: 'video' } }),
        prisma.media.aggregate({ where: { isDeleted: false }, _sum: { size: true } })
      ]).then(([totalFiles, totalImages, totalVideos, storage]) => ({
        totalFiles, totalImages, totalVideos,
        totalStorageUsed: mediaService.formatFileSize(storage._sum.size || 0)
      }))
    ]);

    return await successResponseWithData(res, 'success_generic', {
      results: mediaService.withFormattedSize(results), stats,
      pagination: { totalCount, page: pageNumber, limit: limitNumber, totalPages: Math.ceil(totalCount / limitNumber) }
    });
  } catch (error) {
    console.error('Get media list error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

export const getMediaDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const media = await prisma.media.findFirst({
      where: { id, isDeleted: false },
      include: { _count: { select: { thumbnailCollections: true, bannerCollections: true, userProfiles: true } } }
    });
    if (!media) return await notFoundResponse(res, 'error_not_found');

    let settingsUsage = 0;
    const settings = await prisma.globalSettings.findFirst();
    if (settings?.general) {
      if (settings.general.logo === id) settingsUsage++;
      if (settings.general.favicon === id) settingsUsage++;
    }

    const usedIn = media._count.thumbnailCollections + media._count.bannerCollections + media._count.userProfiles + settingsUsage;
    const formattedMedia = {
      id: media.id, name: media.name, fileName: media.fileName, fileType: media.fileType,
      mime: media.mime, sizeFormatted: mediaService.formatFileSize(media.size), ext: media.ext,
      createdAt: media.createdAt, altText: media.alternativeText, url: media.url,
      caption: media.caption, tags: media.tags, usedIn
    };

    return await successResponseWithData(res, 'success_generic', formattedMedia);
  } catch (error) {
    console.error('Get media detail error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

export const deleteMedia = async (req, res) => {
  const { id } = req.params;
  try {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return await notFoundResponse(res, 'error_not_found');

    // Audit Context
    res.locals.beforeData = media;
    res.locals.entityId = id;
    res.locals.entityType = 'Media';

    const operations = [
      prisma.user.updateMany({ where: { profilePictureId: id }, data: { profilePictureId: null } }),
      prisma.collection.updateMany({ where: { thumbnailId: id }, data: { thumbnailId: null } }),
      prisma.collection.updateMany({ where: { bannerId: id }, data: { bannerId: null } })
    ];

    const settings = await prisma.globalSettings.findFirst();
    if (settings?.general) {
      const general = { ...settings.general };
      let changed = false;
      if (general.logo === id) { general.logo = null; changed = true; }
      if (general.favicon === id) { general.favicon = null; changed = true; }
      if (changed) operations.push(prisma.globalSettings.update({ where: { id: settings.id }, data: { general } }));
    }

    operations.push(prisma.media.update({ where: { id }, data: { isDeleted: true } }));
    await prisma.$transaction(operations);

    eventBus.emit("data:deleted", {
      module: "MEDIA",
      title: "Media Deleted",
      message: `Media file "${media.name || media.fileName}" has been removed.`,
      userId: req.user.id,
      data: { id: id }
    });

    return await successResponseWithData(res, 'success_deleted', null);

  } catch (error) {
    console.error('Transactional delete media error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

export const updateMedia = async (req, res) => {
  const { id } = req.params;
  const { name, tags, altText, caption } = req.body;
  const file = req.file;

  try {
    const existing = await prisma.media.findFirst({ where: { id, isDeleted: false } });
    if (!existing) return await notFoundResponse(res, 'error_not_found');

    // Audit Context: capture before state
    res.locals.beforeData = existing;
    res.locals.entityId = id;
    res.locals.entityType = 'Media';

    const data = {};
    if (file) {
      data.fileName = file.filename;
      data.url = `/${file.path.replace(/\\/g, '/')}`;
      data.size = file.size;
      data.mime = file.mimetype;
      data.ext = path.extname(file.originalname);
      data.fileType = file.mimetype.split('/')[0];
    }

    if (name !== undefined) data.name = name;
    if (altText !== undefined) data.alternativeText = altText;
    if (caption !== undefined) data.caption = caption;
    if (tags !== undefined) data.tags = typeof tags === 'string' ? tags.split(/[,\s]+/).map(t => t.trim()).filter(Boolean) : (Array.isArray(tags) ? tags : []);

    const updated = await prisma.media.update({ where: { id }, data });

    // Audit Context: capture after state
    res.locals.afterData = updated;

    return await successResponseWithData(res, 'success_updated', mediaService.withFormattedSize(updated));
  } catch (error) {
    console.error('Update media error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};
