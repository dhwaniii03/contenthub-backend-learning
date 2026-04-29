import fs from 'fs/promises';
import path from 'path';

/**
 * Safely delete a file from the server (Async/Non-blocking)
 * @param {string} relativePath - The path stored in database (e.g., 'public/uploads/...')
 */
export const deleteFile = async (relativePath) => {
  if (!relativePath) return;

  try {
    // Normalize path to ensure it works on all OS
    const absolutePath = path.resolve(relativePath);

    // Check if file exists before trying to delete
    await fs.access(absolutePath);
    await fs.unlink(absolutePath);
    console.log(`Successfully deleted old file: ${relativePath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File already gone, no problem
      return;
    }
    console.error(`Error deleting file ${relativePath}:`, error.message);
  }
};
