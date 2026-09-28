import * as exportService from '../services/export.service.js';

/**
 * GET /api/v1/exports/wsm
 * WhatsApp Marketing Export — CSV download
 * Query params:
 *   segment = all | high_value | recent
 *   minSpend = number (used when segment=high_value)
 */
export const exportWSM = async (req, res, next) => {
  try {
    const { segment = 'all', minSpend } = req.query;

    const validSegments = ['all', 'high_value', 'recent'];
    if (!validSegments.includes(segment)) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: `segment must be one of: ${validSegments.join(', ')}`,
      });
    }

    const customers = await exportService.getCustomersForExport(
      segment,
      parseFloat(minSpend) || 0
    );

    const csv = exportService.buildCSV(customers);

    const filename = `spg_customers_${segment}_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
