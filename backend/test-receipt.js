import { generateThermalReceiptPDF } from './src/services/receipt.service.js';

const mockInvoice = {
  invoiceNo: 'SPG-12345',
  createdAt: new Date(),
  totalAmount: 500,
  paymentMode: 'UPI',
  items: [
    { productName: 'Incense', quantity: 2, unitSalePrice: 150 },
    { productName: 'Lamp', quantity: 1, unitSalePrice: 200 }
  ]
};

generateThermalReceiptPDF(mockInvoice)
  .then(() => console.log('Success!'))
  .catch(err => console.error('Failed:', err));
