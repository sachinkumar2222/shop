import * as invoiceService from '../services/invoice.service.js';
import { NotFoundError } from '../utils/AppError.js';

export const listInvoices = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const data = await invoiceService.listInvoices({ page, limit });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getInvoice = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoiceByNumber(req.params.invoiceNo);
    if (!invoice) throw new NotFoundError('Invoice not found');
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};
