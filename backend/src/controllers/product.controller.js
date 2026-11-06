import * as productService from '../services/product.service.js';
import { PrismaClient } from '@prisma/client';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinary.service.js';

const prisma = new PrismaClient();

export const getAllProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const getProductByBarcode = async (req, res, next) => {
  try {
    const product = await productService.getProductByBarcode(req.params.barcode);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await productService.getLowStockProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ success: true, message: 'Product created', data: product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json({ success: true, message: 'Product updated', data: product });
  } catch (error) {
    next(error);
  }
};

export const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    // 1. Fetch current product to find any existing image to clean up
    const existingProduct = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { imageUrl: true },
    });

    // 2. Attempt upload to Cloudinary (returns secure HTTPS URL)
    let imageUrl = null;
    try {
      const cloudinaryUrl = await uploadImageToCloudinary(req.file.path, 'shreepooja/products');
      if (cloudinaryUrl) {
        imageUrl = cloudinaryUrl;
      }
    } catch (uploadErr) {
      // If Cloudinary fails, fallback to local path
      console.error('Cloudinary upload failed, falling back to local storage:', uploadErr.message);
    }

    if (!imageUrl) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    }

    // 3. Update product with new image URL
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { imageUrl },
    });

    // 4. Delete old image from Cloudinary (or disk) so storage remains clean
    if (existingProduct?.imageUrl && existingProduct.imageUrl !== imageUrl) {
      deleteImageFromCloudinary(existingProduct.imageUrl).catch((delErr) => {
        console.warn('Failed to delete old image after replacement:', delErr.message);
      });
    }

    res.json({ success: true, message: 'Image uploaded successfully', data: { imageUrl, product } });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};
