import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
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
 * Extract public_id from Cloudinary URL
 * e.g. https://res.cloudinary.com/dlee2a2rx/image/upload/v12345/shreepooja/products/xyz.jpg -> shreepooja/products/xyz
 */
export const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com')) return null;

  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return null;

  const pathAfterUpload = url.slice(uploadIndex + '/upload/'.length);
  const segments = pathAfterUpload.split('/');
  const nonTransformSegments = [];

  for (const seg of segments) {
    if (/^v\d+$/.test(seg)) continue; // skip version tag e.g. v1730873841
    if (seg.includes(',') || /^[a-z]_[a-z0-9_]+$/i.test(seg)) continue; // skip transformation tags
    nonTransformSegments.push(seg);
  }

  const cleanPath = nonTransformSegments.join('/');
  const lastDotIndex = cleanPath.lastIndexOf('.');
  return lastDotIndex !== -1 ? cleanPath.slice(0, lastDotIndex) : cleanPath;
};

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

/**
 * Delete image from Cloudinary (or local storage if not on Cloudinary)
 * @param {string} imageUrl - HTTPS Cloudinary URL or local relative path
 */
export const deleteImageFromCloudinary = async (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  // 1. If it's hosted on Cloudinary
  if (imageUrl.includes('cloudinary.com')) {
    if (!isCloudinaryConfigured) {
      logger.warn('Cloudinary not configured; cannot delete remote asset:', imageUrl);
      return null;
    }

    const publicId = extractPublicId(imageUrl);
    if (!publicId) {
      logger.warn({ imageUrl }, 'Could not extract public_id from Cloudinary URL');
      return null;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
      logger.info({ publicId, result }, 'Successfully deleted image from Cloudinary');
      return result;
    } catch (err) {
      logger.error({ err: err.message, publicId, imageUrl }, 'Failed to delete image from Cloudinary');
      return null;
    }
  }

  // 2. If it's a local file URL e.g. /uploads/products/...
  try {
    const cleanPath = imageUrl.replace(/^\//, '');
    const fullPath = path.resolve(process.cwd(), cleanPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info({ fullPath }, 'Successfully deleted local image file');
    }
  } catch (localErr) {
    logger.warn({ err: localErr.message, imageUrl }, 'Could not delete local image file');
  }

  return null;
};

export const isCloudinaryReady = () => isCloudinaryConfigured;

export default cloudinary;
