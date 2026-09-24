import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Typography } from '@rentify/shared/ui/typography';

const styles = {
  page: "p-6 md:p-8 font-sans text-xs leading-normal text-slate-800 bg-white relative min-h-[640px] flex flex-col justify-between select-none",
  watermark: "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-45 text-5xl md:text-8xl text-slate-900 font-extrabold opacity-[0.04] select-none pointer-events-none -z-0 font-sans tracking-widest uppercase",
  header: "flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-slate-200/90 gap-4",
  leftHeader: "flex items-start gap-3 w-full sm:w-3/5",
  logo: "w-11 h-11 rounded-lg object-contain border border-slate-100 p-0.5 shadow-2xs shrink-0",
  companyDetails: "flex flex-col gap-0.5 max-w-full",
  companyName: "text-base font-bold text-slate-900 tracking-tight font-sans",
  companyText: "text-[11px] text-slate-500 leading-snug",
  rightHeader: "w-full sm:w-2/5 flex flex-col items-start sm:items-end justify-start gap-1.5",
  invoiceTitle: "text-2xl font-black tracking-wider text-slate-900 uppercase font-sans",
  invoiceNumberBox: "text-xs px-2.5 py-1 rounded-md bg-slate-100 font-mono font-semibold text-slate-800 border border-slate-200/80 shadow-2xs",
  detailsSection: "flex flex-col sm:flex-row justify-between gap-6 mb-6",
  billToSection: "w-full sm:w-1/2 space-y-1",
  sectionTitle: "text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans",
  customerName: "text-sm font-bold text-slate-900 font-sans",
  customerDetails: "text-xs text-slate-500 leading-relaxed",
  invoiceMetaSection: "w-full sm:w-1/2 flex justify-start sm:justify-end",
  metaCard: "bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 w-full sm:max-w-[220px] space-y-2 shadow-2xs",
  metaRow: "flex justify-between items-center text-xs",
  metaLabel: "text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans",
  metaValue: "text-xs font-semibold text-slate-800 font-mono",
  table: "mb-6 border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs",
  tableHeader: "flex flex-row bg-slate-50/90 border-b border-slate-200/80 px-3.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans",
  tableRow: "flex flex-row items-center border-b border-slate-100 last:border-b-0 px-3.5 py-2.5 text-xs text-slate-700 transition-colors",
  tableRowAlternate: "bg-slate-50/40",
  colDescription: "flex-1 pr-2",
  colQty: "w-14 text-center",
  colRate: "w-20 text-right",
  colAmount: "w-24 text-right font-semibold text-slate-900",
  itemName: "font-semibold text-slate-900 text-xs",
  itemDescription: "text-[10px] text-slate-500 mt-0.5",
  noItems: "py-8 text-center text-slate-400 text-xs italic",
  totalsSection: "flex justify-end mb-6",
  totalsContainer: "w-full sm:w-64 space-y-1.5 text-xs",
  totalRow: "flex justify-between text-slate-600",
  totalLabel: "text-slate-500",
  totalValue: "font-medium text-slate-800 font-mono",
  finalTotalRow: "flex justify-between items-baseline pt-2 mt-2 border-t-2 border-slate-900 text-slate-900",
  finalTotalLabel: "text-xs font-bold uppercase tracking-wider",
  finalTotalValue: "text-base font-extrabold text-slate-900 font-mono",
  notesSection: "mb-6 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 text-xs",
  notesTitle: "text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans mb-1",
  notesText: "text-xs text-slate-600 leading-relaxed",
  signatureSection: "flex flex-col sm:flex-row justify-between mb-6 pt-4 gap-6",
  signatureBox: "w-full sm:w-[45%] text-center",
  signatureTitle: "text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans mb-8",
  signatureLine: "border-b border-slate-300 mb-1.5",
  signatureLabel: "text-[10px] text-slate-400",
  qrSection: "flex flex-col items-center mb-6 p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 text-center shadow-2xs",
  qrTitle: "text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider font-sans",
  qrDescription: "text-[10px] text-slate-500 text-center max-w-[220px] mx-auto",
  footer: "mt-auto pt-4 border-t border-slate-200/80",
  footerInfo: "flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-1",
  footerLeft: "flex items-center gap-3",
  footerRight: "",
  barcode: "font-mono tracking-wider",
  thanksSection: "text-center pt-3 mt-3 border-t border-slate-100",
  thanksText: "text-xs font-bold text-slate-700 uppercase tracking-widest font-sans",
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
    <Card className="bg-white shadow-xl shadow-slate-200/70 dark:shadow-none border border-slate-200 rounded-2xl overflow-hidden w-full font-sans transition-all ring-1 ring-black/5">
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
              {companyInfo?.address && (
                <Typography variant="p" className={styles.companyText}>
                  {companyInfo.address}
                </Typography>
              )}
              {companyInfo?.phone && (
                <Typography variant="p" className={styles.companyText}>
                  Tel: {companyInfo.phone}
                </Typography>
              )}
              {companyInfo?.email && (
                <Typography variant="p" className={styles.companyText}>
                  Email: {companyInfo.email}
                </Typography>
              )}
              {companyInfo?.website && (
                <Typography variant="p" className={styles.companyText}>
                  Web: {companyInfo.website}
                </Typography>
              )}
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
              Billed To
            </Typography>
            <Typography variant="h3" className={styles.customerName}>
              {invoiceData.customerName || 'Customer Name'}
            </Typography>
            {invoiceData.address ? (
              <Typography variant="p" className={styles.customerDetails}>
                {invoiceData.address}
              </Typography>
            ) : (
              <Typography variant="p" className={`${styles.customerDetails} italic text-slate-400`}>
                No billing address specified
              </Typography>
            )}
            {invoiceData.customerPhone && (
              <Typography variant="p" className={styles.customerDetails}>
                {invoiceData.customerPhone}
              </Typography>
            )}
          </div>
          <div className={styles.invoiceMetaSection}>
            <div className={styles.metaCard}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Invoice No</span>
                <span className={styles.metaValue}>{invoiceData.invoiceNumber}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Issue Date</span>
                <span className={styles.metaValue}>{formatDate(invoiceData.createdAt)}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Due Date</span>
                <span className={styles.metaValue}>{formatDate(invoiceData.dueDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div className={styles.colDescription}>Item Description</div>
            <div className={styles.colQty}>Qty</div>
            <div className={styles.colRate}>Rate</div>
            <div className={styles.colAmount}>Amount</div>
          </div>
          {invoiceData.items.length === 0 ? (
            <div className={styles.noItems}>
              No items added to invoice
            </div>
          ) : (
            invoiceData.items.map((item, index) => (
              <div
                key={item.id || index}
                className={`${styles.tableRow} ${
                  index % 2 === 1 ? styles.tableRowAlternate : ''
                }`}
              >
                <div className={styles.colDescription}>
                  <div className={styles.itemName}>
                    {item.name || 'Untitled Item'}
                  </div>
                  {item.description && (
                    <div className={styles.itemDescription}>
                      {item.description}
                    </div>
                  )}
                </div>
                <div className={styles.colQty}>{item.quantity}</div>
                <div className={styles.colRate}>
                  {formatCurrency(item.price)}
                </div>
                <div className={styles.colAmount}>
                  {formatCurrency(item.quantity * item.price)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals Section */}
        <div className={styles.totalsSection}>
          <div className={styles.totalsContainer}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Subtotal</span>
              <span className={styles.totalValue}>{invoiceData.subtotal}</span>
            </div>
            {invoiceData.discountAmount !== '$0.00' && (
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Discount ({invoiceData.discount}%)</span>
                <span className={`${styles.totalValue} text-emerald-600`}>
                  -{invoiceData.discountAmount}
                </span>
              </div>
            )}
            {invoiceData.taxAmount !== '$0.00' && (
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>
                  Tax ({invoiceData.taxType === 'vat' ? 'VAT 10%' : 'Tax'})
                </span>
                <span className={styles.totalValue}>+{invoiceData.taxAmount}</span>
              </div>
            )}
            <div className={styles.finalTotalRow}>
              <span className={styles.finalTotalLabel}>Total Due</span>
              <span className={styles.finalTotalValue}>{invoiceData.total}</span>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        {invoiceData.notes && (
          <div className={styles.notesSection}>
            <Typography variant="h4" className={styles.notesTitle}>
              Notes & Terms
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
                Seller Representative
              </Typography>
            </div>
            <div className={styles.signatureBox}>
              <Typography variant="h4" className={styles.signatureTitle}>
                Customer Signature
              </Typography>
              <div className={styles.signatureLine} />
              <Typography variant="p" className={styles.signatureLabel}>
                Client Acceptance
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
            <div className="w-20 h-20 mb-2 mx-auto p-1 bg-white rounded-lg border border-slate-200">
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
              <span>Page {pageNumber} of {totalPages}</span>
              {invoiceData.referenceId && (
                <span className={styles.barcode}>
                  REF: {generateBarcode(invoiceData.referenceId)}
                </span>
              )}
            </div>
            <div className={styles.footerRight}>
              <span>Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')}</span>
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

export default InvoicePreview;