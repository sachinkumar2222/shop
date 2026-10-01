export const printThermalReceipt = async (invoiceNo) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Allow pop-ups to open the printer bill.');
  }

  printWindow.document.title = 'Preparing bill';
  printWindow.document.body.innerHTML = '<p style="font:16px Arial,sans-serif;padding:24px">Preparing printer bill…</p>';

  try {
    const rawToken = localStorage.getItem('token');
    const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' ? rawToken : null;
    const response = await fetch(`/api/v1/invoices/${encodeURIComponent(invoiceNo)}/thermal-receipt.html`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Could not generate bill (${response.status})`);
    }

    const receiptHtml = await response.text();
    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();

    const toolbarStyle = printWindow.document.createElement('style');
    toolbarStyle.textContent = `
      .print-controls { position: sticky; top: 0; display: flex; justify-content: center; padding: 10px; background: #f1f5f9; font: 14px Arial, sans-serif; }
      .print-controls button { padding: 8px 16px; border: 0; border-radius: 6px; background: #c2410c; color: #fff; font-weight: 700; cursor: pointer; }
      @media print { .print-controls { display: none !important; } }
    `;
    printWindow.document.head.appendChild(toolbarStyle);

    const printControls = printWindow.document.createElement('div');
    printControls.className = 'print-controls';
    const printButton = printWindow.document.createElement('button');
    printButton.type = 'button';
    printButton.textContent = 'Print Bill';
    printButton.addEventListener('click', () => {
      printWindow.focus();
      printWindow.print();
    });
    printControls.appendChild(printButton);
    printWindow.document.body.prepend(printControls);

    window.setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.focus();
        printWindow.print();
      }
    }, 500);
  } catch (error) {
    printWindow.close();
    throw error;
  }
};
