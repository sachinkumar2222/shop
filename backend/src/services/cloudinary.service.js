import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { logger } from '../config/logger.js';

// Configure Cloudinary from CLOUDINARY_URL or discrete env vars
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
} else if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dlee2a2rx',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Upload local file to Cloudinary
 * @param {string} localFilePath - Path to temporary file
 * @param {string} folder - Target Cloudinary folder
 * @returns {Promise<string>} - Cloudinary secure HTTPS URL
 */
export const uploadImageToCloudinary = async (localFilePath, folder = 'shreepooja/products') => {
  if (!isCloudinaryConfigured) {
    logger.warn('Cloudinary credentials not detected in env, retaining local file');
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }, // Auto optimize format and compression
      ],
    });

    // Cleanup local temp file once successfully uploaded to Cloudinary
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (cleanupErr) {
      logger.warn({ err: cleanupErr.message }, 'Failed to remove local temp image after Cloudinary upload');
    }

    return result.secure_url;
  } catch (err) {
    logger.error({ err: err.message, localFilePath }, 'Error uploading image to Cloudinary');
    throw err;
  }
};

export const isCloudinaryReady = () => isCloudinaryConfigured;

export default cloudinary;
