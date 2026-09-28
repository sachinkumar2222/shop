import * as customerService from '../services/customer.service.js';
import { NotFoundError } from '../utils/AppError.js';

export const listCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const data = await customerService.listCustomers({ page, limit });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getCustomerByPhone = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerByPhone(req.params.phone);
    if (!customer) throw new NotFoundError('Customer not found');
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};
