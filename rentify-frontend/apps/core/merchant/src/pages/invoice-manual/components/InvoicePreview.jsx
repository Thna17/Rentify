import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Typography } from '@rentify/shared/ui/typography';

// Define Tailwind CSS classes to match InvoiceDocument's react-pdf styles
const styles = {
  page: "p-5 md:p-10 font-sans text-[10px] leading-[1.4] text-gray-900 bg-white relative",
  watermark: "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-45 text-4xl md:text-8xl text-gray-100 font-bold opacity-10 -z-10 font-sans",
  header: "flex flex-col md:flex-row justify-between items-start mb-8 pb-5 border-b border-gray-300 flex-wrap",
  leftHeader: "flex flex-row items-start gap-2.5 w-full md:w-3/5",
  logo: "w-11 h-11 rounded-md object-contain",
  companyDetails: "flex flex-col gap-0.5 max-w-full",
  companyName: "text-sm font-bold text-gray-900 mb-0.5 tracking-wider font-sans",
  companyText: "text-[8px] text-gray-600 leading-[1.4]",
  rightHeader: "w-full md:w-[38%] items-start md:items-end justify-start gap-1.25 mt-4 md:mt-0",
  invoiceTitle: "text-base md:text-lg font-bold tracking-wider text-gray-900",
  invoiceNumberBox: "text-[9px] px-2.5 py-1.25 border border-gray-900 rounded bg-gray-50 font-bold text-gray-900 text-center mt-1",
  detailsSection: "flex flex-col md:flex-row justify-between mb-6 mt-1.25",
  billToSection: "w-full md:w-[48%] mb-4 md:mb-0",
  sectionTitle: "text-[10px] font-bold text-gray-900 mb-2 uppercase tracking-wider pb-1 border-b border-gray-300 font-sans",
  customerName: "text-xs font-bold text-gray-900 mb-1.5 font-sans",
  customerDetails: "text-[9px] text-gray-600 leading-6",
  invoiceMetaSection: "w-full md:w-[48%]",
  metaTable: "border border-gray-300 bg-white",
  metaRow: "flex flex-row border-b border-gray-300",
  metaRowLast: "border-b-0",
  metaLabelCell: "w-[55%] p-2 border-r border-gray-300 bg-gray-50",
  metaValueCell: "w-[45%] p-2",
  metaLabel: "text-[8px] text-gray-900 font-bold uppercase tracking-wider font-sans",
  metaValue: "text-[9px] text-gray-900",
  table: "mb-5 border border-gray-300 overflow-x-auto",
  tableHeader: "flex flex-row bg-gray-50 border-b border-gray-300",
  tableHeaderCell: "p-2.5 border-r border-gray-300",
  tableHeaderCellLast: "border-r-0",
  tableHeaderText: "text-[9px] font-bold text-gray-900 uppercase tracking-wider font-sans",
  tableRow: "flex flex-row border-b border-gray-300",
  tableRowLast: "border-b-0",
  tableRowAlternate: "bg-gray-50",
  tableCell: "p-2.5 border-r border-gray-300",
  tableCellLast: "border-r-0",
  colDescription: "w-[45%]",
  colQty: "w-[12%] text-center",
  colRate: "w-[18%] text-right",
  colAmount: "w-[25%] text-right",
  itemName: "text-[10px] text-gray-900 font-bold mb-0.5 font-sans",
  itemDescription: "text-[8px] text-gray-600 leading-[1.3]",
  itemValue: "text-[9px] text-gray-900",
  itemAmount: "text-[10px] text-gray-900 font-bold font-sans",
  noItems: "p-7.5 text-center text-gray-600 text-[11px] italic",
  totalsSection: "flex justify-end mb-6",
  totalsContainer: "w-full md:w-1/2 border border-gray-300",
  totalRow: "flex flex-row border-b border-gray-300",
  totalRowLast: "border-b-0",
  totalLabelCell: "w-[65%] p-2.5 border-r border-gray-300",
  totalValueCell: "w-[35%] p-2.5",
  totalLabel: "text-[9px] text-gray-900 font-bold font-sans",
  totalValue: "text-[10px] text-gray-900 text-right",
  finalTotalRow: "bg-gray-50 border-t border-gray-300",
  finalTotalLabel: "text-[11px] font-bold text-gray-900 font-sans",
  finalTotalValue: "text-xs font-bold text-gray-900 text-right font-sans",
  notesSection: "mb-6 p-3.75 border border-gray-300 bg-gray-50",
  notesTitle: "text-[10px] font-bold text-gray-900 mb-2 uppercase tracking-wider font-sans",
  notesText: "text-[9px] text-gray-900 leading-[1.4]",
  signatureSection: "flex flex-col md:flex-row justify-between mb-6 pt-5 gap-2.5",
  signatureBox: "w-full md:w-[45%] p-3.75 border border-gray-300 bg-white",
  signatureTitle: "text-[9px] font-bold text-gray-900 mb-6.25 uppercase tracking-wider font-sans",
  signatureLine: "border-b border-gray-600 mb-1.25 h-7.5",
  signatureLabel: "text-[8px] text-gray-600 text-center",
  qrSection: "items-center mb-6 p-5 border border-gray-300 bg-gray-50 text-center",
  qrTitle: "text-[11px] font-bold text-gray-900 mb-3 uppercase tracking-wider font-sans",
  qrDescription: "text-[8px] text-gray-600 text-center max-w-[200px] mx-auto",
  footer: "mt-auto",
  footerInfo: "flex flex-col md:flex-row justify-between items-center pt-3.75 border-t border-gray-300",
  footerLeft: "flex-1",
  footerRight: "flex-1 items-start md:items-end",
  pageNumber: "text-[8px] text-gray-600",
  printTimestamp: "text-[8px] text-gray-600",
  barcode: "text-[8px] text-gray-600 font-mono tracking-widest",
  thanksSection: "text-center p-5 mt-3.75 bg-gray-50 border-t border-b border-gray-300",
  thanksText: "text-sm font-bold text-gray-900 uppercase tracking-widest font-sans",
};

export const InvoicePreview = ({
  invoiceData,
  websiteName,
  companyInfo,
  showSignatures = true,
  showWatermark = true,
  pageNumber = 1,
  totalPages = 1,
}) => {
  const safeWebsiteName = websiteName || 'Invoice';

  const formatDate = (dateString) => {
    try {
      return dateString ? format(new Date(dateString), 'MMM dd, yyyy') : '';
    } catch (e) {
      return '';
    }
  };

  const formatCurrency = (amount) => {
    const currencySymbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      KHR: '៛',
      THB: '฿',
    };
    const symbol = currencySymbols[invoiceData.currency] || '$';
    return `${symbol}${
      typeof amount === 'string' ? amount : amount.toFixed(2)
    }`;
  };

  const generateBarcode = (text) => {
    return text
      .split('')
      .map((char) => char.charCodeAt(0).toString().padStart(3, '0'))
      .join(' ');
  };

  return (
    <Card className="bg-white shadow-md border border-gray-300 overflow-hidden w-full max-w-full md:max-w-[600px] mx-auto font-sans">
      <CardContent className={styles.page}>
        {/* Watermark */}
        {showWatermark && companyInfo?.watermark && (
          <div className={styles.watermark}>
            <Typography variant="p">{companyInfo.watermark}</Typography>
          </div>
        )}

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.leftHeader}>
            {companyInfo?.logo && (
              <img
                src={companyInfo.logo}
                alt="Company Logo"
                className={styles.logo}
              />
            )}
            <div className={styles.companyDetails}>
              <Typography variant="h3" className={styles.companyName}>
                {companyInfo?.name || safeWebsiteName}
              </Typography>
              <Typography variant="p" className={styles.companyText}>
                {companyInfo?.address}
              </Typography>
              <Typography variant="p" className={styles.companyText}>
                Phone: {companyInfo?.phone}
              </Typography>
              <Typography variant="p" className={styles.companyText}>
                Email: {companyInfo?.email}
              </Typography>
              <Typography variant="p" className={styles.companyText}>
                Website: {companyInfo?.website}
              </Typography>
            </div>
          </div>
          <div className={styles.rightHeader}>
            <Typography variant="h2" className={styles.invoiceTitle}>
              INVOICE
            </Typography>
            <div className={styles.invoiceNumberBox}>
              <Typography variant="p">{invoiceData.invoiceNumber}</Typography>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className={styles.detailsSection}>
          <div className={styles.billToSection}>
            <Typography variant="h4" className={styles.sectionTitle}>
              Bill To
            </Typography>
            <Typography variant="h3" className={styles.customerName}>
              {invoiceData.customerName || 'Customer Name'}
            </Typography>
            <Typography variant="p" className={styles.customerDetails}>
              {invoiceData.address}
            </Typography>
            <Typography variant="p" className={styles.customerDetails}>
              {invoiceData.customerPhone}
            </Typography>
          </div>
          <div className={styles.invoiceMetaSection}>
            <div className={styles.metaTable}>
              <div className={styles.metaRow}>
                <div className={styles.metaLabelCell}>
                  <Typography variant="p" className={styles.metaLabel}>
                    Invoice Number
                  </Typography>
                </div>
                <div className={styles.metaValueCell}>
                  <Typography variant="p" className={styles.metaValue}>
                    {invoiceData.invoiceNumber}
                  </Typography>
                </div>
              </div>
              <div className={styles.metaRow}>
                <div className={styles.metaLabelCell}>
                  <Typography variant="p" className={styles.metaLabel}>
                    Date of Issue
                  </Typography>
                </div>
                <div className={styles.metaValueCell}>
                  <Typography variant="p" className={styles.metaValue}>
                    {formatDate(invoiceData.createdAt)}
                  </Typography>
                </div>
              </div>
              <div className={`${styles.metaRow} ${styles.metaRowLast}`}>
                <div className={styles.metaLabelCell}>
                  <Typography variant="p" className={styles.metaLabel}>
                    Due Date
                  </Typography>
                </div>
                <div className={styles.metaValueCell}>
                  <Typography variant="p" className={styles.metaValue}>
                    {formatDate(invoiceData.dueDate)}
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div className={`${styles.tableHeaderCell} ${styles.colDescription}`}>
              <Typography variant="p" className={styles.tableHeaderText}>
                Description
              </Typography>
            </div>
            <div className={`${styles.tableHeaderCell} ${styles.colQty}`}>
              <Typography variant="p" className={styles.tableHeaderText}>
                Qty
              </Typography>
            </div>
            <div className={`${styles.tableHeaderCell} ${styles.colRate}`}>
              <Typography variant="p" className={styles.tableHeaderText}>
                Rate
              </Typography>
            </div>
            <div className={`${styles.tableHeaderCell} ${styles.colAmount} ${styles.tableHeaderCellLast}`}>
              <Typography variant="p" className={styles.tableHeaderText}>
                Amount
              </Typography>
            </div>
          </div>
          {invoiceData.items.length === 0 ? (
            <Typography variant="p" className={styles.noItems}>
              No items added
            </Typography>
          ) : (
            invoiceData.items.map((item, index) => (
              <div
                key={item.id || index}
                className={`${styles.tableRow} ${
                  index % 2 === 1 ? styles.tableRowAlternate : ''
                } ${
                  index === invoiceData.items.length - 1 ? styles.tableRowLast : ''
                }`}
              >
                <div className={`${styles.tableCell} ${styles.colDescription}`}>
                  <Typography variant="p" className={styles.itemName}>
                    {item.name || 'Item Description'}
                  </Typography>
                  {item.description && (
                    <Typography variant="p" className={styles.itemDescription}>
                      {item.description}
                    </Typography>
                  )}
                </div>
                <div className={`${styles.tableCell} ${styles.colQty}`}>
                  <Typography variant="p" className={styles.itemValue}>
                    {item.quantity}
                  </Typography>
                </div>
                <div className={`${styles.tableCell} ${styles.colRate}`}>
                  <Typography variant="p" className={styles.itemValue}>
                    {formatCurrency(item.price)}
                  </Typography>
                </div>
                <div className={`${styles.tableCell} ${styles.colAmount} ${styles.tableCellLast}`}>
                  <Typography variant="p" className={styles.itemAmount}>
                    {formatCurrency(item.quantity * item.price)}
                  </Typography>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals Section */}
        <div className={styles.totalsSection}>
          <div className={styles.totalsContainer}>
            <div className={styles.totalRow}>
              <div className={styles.totalLabelCell}>
                <Typography variant="p" className={styles.totalLabel}>
                  Subtotal
                </Typography>
              </div>
              <div className={styles.totalValueCell}>
                <Typography variant="p" className={styles.totalValue}>
                  {invoiceData.subtotal}
                </Typography>
              </div>
            </div>
            {invoiceData.discountAmount !== '$0.00' && (
              <div className={styles.totalRow}>
                <div className={styles.totalLabelCell}>
                  <Typography variant="p" className={styles.totalLabel}>
                    Discount
                  </Typography>
                </div>
                <div className={styles.totalValueCell}>
                  <Typography variant="p" className={styles.totalValue}>
                    {invoiceData.discountAmount}
                  </Typography>
                </div>
              </div>
            )}
            {invoiceData.taxAmount !== '$0.00' && (
              <div className={styles.totalRow}>
                <div className={styles.totalLabelCell}>
                  <Typography variant="p" className={styles.totalLabel}>
                    Tax
                  </Typography>
                </div>
                <div className={styles.totalValueCell}>
                  <Typography variant="p" className={styles.totalValue}>
                    {invoiceData.taxAmount}
                  </Typography>
                </div>
              </div>
            )}
            <div className={`${styles.totalRow} ${styles.finalTotalRow}`}>
              <div className={styles.totalLabelCell}>
                <Typography variant="p" className={styles.finalTotalLabel}>
                  Total
                </Typography>
              </div>
              <div className={styles.totalValueCell}>
                <Typography variant="p" className={styles.finalTotalValue}>
                  {invoiceData.total}
                </Typography>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        {invoiceData.notes && (
          <div className={styles.notesSection}>
            <Typography variant="h4" className={styles.notesTitle}>
              Notes
            </Typography>
            <Typography variant="p" className={styles.notesText}>
              {invoiceData.notes}
            </Typography>
          </div>
        )}

        {/* Signatures Section */}
        {showSignatures && (
          <div className={styles.signatureSection}>
            <div className={styles.signatureBox}>
              <Typography variant="h4" className={styles.signatureTitle}>
                Authorized Signature
              </Typography>
              <div className={styles.signatureLine} />
              <Typography variant="p" className={styles.signatureLabel}>
                Signature
              </Typography>
            </div>
            <div className={styles.signatureBox}>
              <Typography variant="h4" className={styles.signatureTitle}>
                Customer Signature
              </Typography>
              <div className={styles.signatureLine} />
              <Typography variant="p" className={styles.signatureLabel}>
                Signature
              </Typography>
            </div>
          </div>
        )}

        {/* QR Code Section */}
        {invoiceData.paymentMethod === 'KHQR' && invoiceData.transactionData && (
          <div className={styles.qrSection}>
            <Typography variant="h3" className={styles.qrTitle}>
              Pay with KHQR
            </Typography>
            <div className="w-20 h-20 mb-2 mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                  invoiceData.transactionData.rawQR
                )}&size=100x100`}
                alt="QR Code"
                className="w-full h-full"
              />
            </div>
            <Typography variant="p" className={styles.qrDescription}>
              Scan to make payment for Invoice #{invoiceData.invoiceNumber}
            </Typography>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            <div className={styles.footerLeft}>
              <Typography variant="p" className={styles.pageNumber}>
                Page {pageNumber} of {totalPages}
              </Typography>
              {invoiceData.referenceId && (
                <Typography variant="p" className={styles.barcode}>
                  REF: {generateBarcode(invoiceData.referenceId)}
                </Typography>
              )}
            </div>
            <div className={styles.footerRight}>
              <Typography variant="p" className={styles.printTimestamp}>
                Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
              </Typography>
            </div>
          </div>
          <div className={styles.thanksSection}>
            <Typography variant="h3" className={styles.thanksText}>
              Thank You For Your Business
            </Typography>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};