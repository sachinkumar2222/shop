'use client';

import { useState, useEffect } from 'react';

/**
 * Universal QR Code Component
 * Generates an SVG / Image QR Code for UPI payment URLs.
 */
export default function QRCode({ value, size = 180 }) {
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    if (value) {
      // Use quick encoding endpoint for QR Code SVG/PNG
      const encoded = encodeURIComponent(value);
      setQrSrc(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=10`);
    }
  }, [value, size]);

  if (!value) return null;

  return (
    <div style={styles.qrContainer}>
      {qrSrc ? (
        <img
          src={qrSrc}
          alt="UPI QR Code"
          width={size}
          height={size}
          style={styles.qrImage}
        />
      ) : (
        <div style={{ width: size, height: size, ...styles.placeholder }}>
          Generating QR...
        </div>
      )}
    </div>
  );
}

const styles = {
  qrContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    padding: '0.75rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
  },
  qrImage: {
    display: 'block',
    borderRadius: '8px',
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    color: '#64748b',
    fontSize: '0.8rem',
    borderRadius: '8px',
  },
};
