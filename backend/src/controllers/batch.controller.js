import * as batchService from '../services/batch.service.js';

export const addBatch = async (req, res, next) => {
  try {
    // Add audit info (user id) to details in real system, skipping for now
    const batch = await batchService.addBatch(req.body);
    res.status(201).json({ success: true, message: 'Batch added successfully', data: batch });
  } catch (error) {
    next(error);
  }
};

export const getProductBatches = async (req, res, next) => {
  try {
    const batches = await batchService.getProductBatches(req.params.productId);
    res.json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
};
