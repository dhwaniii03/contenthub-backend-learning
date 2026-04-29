import prisma from './prismaClient.js';
import path from 'path';

/**
 * Service to handle Project-Wide Unified Media Library logic.
 * Supports Hybrid logic: accepting either a Media ID (UUID) or a physical file upload.
 */
class MediaService {
  /**
   * Human-readable file size string.
   * @param {number} bytes - Raw byte count
   * @returns {string} e.g. "1.5 MB", "340.20 KB", "512 B"
   */
  formatFileSize(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024)        return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  }

  /**
   * Returns only id and url for a Media record or array (Simplified response)
   */
  simplifyMedia(media) {
    if (!media) return null;
    if (Array.isArray(media)) return media.map(m => ({ id: m.id, url: m.url }));
    return { id: media.id, url: media.url };
  }

  /**
   * Attaches a computed sizeFormatted field to a Media record or array.
   */
  withFormattedSize(media) {
    if (!media) return media;
    if (Array.isArray(media)) return media.map(m => ({ ...m, sizeFormatted: this.formatFileSize(m.size) }));
    return { ...media, sizeFormatted: this.formatFileSize(media.size) };
  }

  /**
   * Registers a file into the Media Library.
   * @param {Object} file - Multer file object
   * @param {Object} options - { name, tags, alternativeText, caption }
   */
  async registerMedia(file, options = {}) {
    if (!file) return null;

    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = file.filename;

    const relativePart = file.destination.replace(/\\/g, '/').split('public/')[1] || file.destination.replace(/\\/g, '/');
    const url = `/public/${relativePart}/${fileName}`.replace(/\/+/g, '/');

    const media = await prisma.media.create({
      data: {
        name: options.name || file.originalname,
        fileName: fileName,
        alternativeText: options.alternativeText || null,
        caption: options.caption || null,
        fileType: file.mimetype.split('/')[0],
        ext: ext,
        mime: file.mimetype,
        size: file.size,           // Raw bytes — formatFileSize() used on output
        url: url,
        tags: options.tags || [],
      }
    });

    return media.id;
  }

  /**
   * Hybrid Handler: Takes a field value (string/ID) and potential file.
   * Returns the final Media ID to be saved in the content record.
   */
  async handleMediaField(fieldName, fieldValue, reqFiles, options = {}) {
    // 1. Check if a fresh file is uploaded for this field
    const file = reqFiles?.[fieldName]?.[0] || reqFiles?.[0]; // Support both fields() and single/array()
    
    if (file) {
      // If a file is provided, always register it and get a new ID
      return await this.registerMedia(file, options);
    }

    // 2. Check if a UUID was provided (Selection from Library)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof fieldValue === 'string' && uuidRegex.test(fieldValue)) {
      return fieldValue;
    }

    // 3. If "null" is explicitly sent as a string (usual for FormData)
    if (fieldValue === 'null' || fieldValue === null) {
      return null;
    }

    // 4. Default: no change — return undefined so callers can skip the update
    return undefined;
  }

  /**
   * Fetch a single Media record by ID (non-deleted only).
   */
  async getMediaById(id) {
    if (!id) return null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return null;
    return await prisma.media.findFirst({ where: { id, isDeleted: false } });
  }
}

export default new MediaService();
