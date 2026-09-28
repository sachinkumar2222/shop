import './globals.css';
import { AuthProvider } from '../context/AuthContext.js';

export const metadata = {
  title: 'Shree Pooja Ghr — POS & Inventory System',
  description: 'Retail POS, Batch Inventory, Profit Analytics & WhatsApp Automation for Shree Pooja Ghr, Ajmer',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
