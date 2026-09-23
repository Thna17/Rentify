import React from 'react';
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';
import { format } from 'date-fns';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf', // Regular
      fontWeight: 'normal',
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', // Bold
      fontWeight: 'bold',
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1Mu51xIIzc.ttf', // Italic
      fontWeight: 'normal',
      fontStyle: 'italic',
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOjCnqEu92Fr1Mu51TzBic6CsE.ttf', // Bold Italic
      fontWeight: 'bold',
      fontStyle: 'italic',
    },
  ],
});

// Minimalist styles with black, white, and accent color palette
const createStyles = () =>
  StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: 'Roboto',
      backgroundColor: '#ffffff',
      lineHeight: 1.4,
      color: '#1A1A1A', // Dark gray for better contrast
      position: 'relative',
    },

    // Watermark
    watermark: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) rotate(-45deg)',
      fontSize: 80,
      color: '#F5F5F5',
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      opacity: 0.1,
      zIndex: -1,
    },

    // Header Section
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 30,
      paddingBottom: 20,
      borderBottom: '1pt solid #E0E0E0',
    },

    leftHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      width: '60%',
    },

    logo: {
      width: 45,
      height: 45,
      borderRadius: 6,
      objectFit: 'contain',
    },

    companyDetails: {
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 2,
      maxWidth: '100%',
    },

    companyName: {
      fontSize: 14,
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      color: '#1A1A1A',
      marginBottom: 2,
      letterSpacing: 0.5,
    },

    companyText: {
      fontSize: 8,
      color: '#4A4A4A',
      lineHeight: 1.4,
    },

    rightHeader: {
      width: '38%',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      gap: 5,
    },

    invoiceTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      letterSpacing: 0.8,
      color: '#1A1A1A',
    },

    invoiceNumberBox: {
      fontSize: 9,
      padding: '5 10',
      border: '1pt solid #1A1A1A',
      borderRadius: 4,
      backgroundColor: '#F9F9F9',
      fontWeight: 'bold',
      color: '#1A1A1A',
      textAlign: 'center',
      marginTop: 4,
    },

    // Details Section
    detailsSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 25,
      marginTop: 5,
    },

    billToSection: {
      width: '48%',
    },

    sectionTitle: {
      fontSize: 10,
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      color: '#1A1A1A',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingBottom: 4,
      borderBottom: '1pt solid #E0E0E0',
    },

    customerName: {
      fontSize: 12,
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      color: '#1A1A1A',
      marginBottom: 6,
    },

    customerDetails: {
      fontSize: 9,
      color: '#4A4A4A',
      lineHeight: 1.5,
    },

    invoiceMetaSection: {
      width: '48%',
    },

    metaTable: {
      border: '1pt solid #E0E0E0',
      backgroundColor: '#ffffff',
    },

    metaRow: {
      flexDirection: 'row',
      borderBottom: '0.5pt solid #E0E0E0',
    },

    metaRowLast: {
      borderBottom: 'none',
    },

    metaLabelCell: {
      width: '55%',
      padding: 8,
      borderRight: '0.5pt solid #E0E0E0',
      backgroundColor: '#F9F9F9',
    },

    metaValueCell: {
      width: '45%',
      padding: 8,
    },

    metaLabel: {
      fontSize: 8,
      color: '#1A1A1A',
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },

    metaValue: {
      fontSize: 9,
      color: '#1A1A1A',
    },

    // Table Section
    table: {
      marginBottom: 20,
      border: '1pt solid #E0E0E0',
    },

    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#F9F9F9',
      borderBottom: '1pt solid #E0E0E0',
    },

    tableHeaderCell: {
      padding: 10,
      borderRight: '0.5pt solid #E0E0E0',
    },

    tableHeaderCellLast: {
      borderRight: 'none',
    },

    tableHeaderText: {
      fontSize: 9,
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      color: '#1A1A1A',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    tableRow: {
      flexDirection: 'row',
      borderBottom: '0.5pt solid #E0E0E0',
    },

    tableRowLast: {
      borderBottom: 'none',
    },

    tableRowAlternate: {
      backgroundColor: '#F9F9F9',
    },

    tableCell: {
      padding: 10,
      borderRight: '0.5pt solid #E0E0E0',
    },

    tableCellLast: {
      borderRight: 'none',
    },

    colDescription: {
      width: '45%',
    },

    colQty: {
      width: '12%',
      textAlign: 'center',
    },

    colRate: {
      width: '18%',
      textAlign: 'right',
    },

    colAmount: {
      width: '25%',
      textAlign: 'right',
    },

    itemName: {
      fontSize: 10,
      color: '#1A1A1A',
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      marginBottom: 2,
    },

    itemDescription: {
      fontSize: 8,
      color: '#4A4A4A',
      lineHeight: 1.3,
    },

    itemValue: {
      fontSize: 9,
      color: '#1A1A1A',
    },

    itemAmount: {
      fontSize: 10,
      color: '#1A1A1A',
      fontFamily: 'Roboto',
      fontWeight: 'bold',
    },

    noItems: {
      padding: 30,
      textAlign: 'center',
      color: '#4A4A4A',
      fontSize: 11,
      fontStyle: 'italic',
    },

    // Totals Section
    totalsSection: {
      alignItems: 'flex-end',
      marginBottom: 25,
    },

    totalsContainer: {
      width: '50%',
      border: '1pt solid #E0E0E0',
    },

    totalRow: {
      flexDirection: 'row',
      borderBottom: '0.5pt solid #E0E0E0',
    },

    totalRowLast: {
      borderBottom: 'none',
    },

    totalLabelCell: {
      width: '65%',
      padding: 10,
      borderRight: '0.5pt solid #E0E0E0',
    },

    totalValueCell: {
      width: '35%',
      padding: 10,
    },

    totalLabel: {
      fontSize: 9,
      color: '#1A1A1A',
      fontFamily: 'Roboto',
      fontWeight: 'bold',
    },

    totalValue: {
      fontSize: 10,
      color: '#1A1A1A',
      textAlign: 'right',
    },

    finalTotalRow: {
      backgroundColor: '#F9F9F9',
      borderTop: '1pt solid #E0E0E0',
    },

    finalTotalLabel: {
      fontSize: 11,
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      color: '#1A1A1A',
    },

    finalTotalValue: {
      fontSize: 12,
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      color: '#1A1A1A',
      textAlign: 'right',
    },

    // Notes Section
    notesSection: {
      marginBottom: 25,
      padding: 15,
      border: '1pt solid #E0E0E0',
      backgroundColor: '#F9F9F9',
    },

    notesTitle: {
      fontSize: 10,
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      color: '#1A1A1A',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    notesText: {
      fontSize: 9,
      color: '#1A1A1A',
      lineHeight: 1.4,
    },

    // Signature Section
    signatureSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 25,
      paddingTop: 20,
    },

    signatureBox: {
      width: '45%',
      padding: 15,
      border: '1pt solid #E0E0E0',
      backgroundColor: '#ffffff',
    },

    signatureTitle: {
      fontSize: 9,
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      color: '#1A1A1A',
      marginBottom: 25,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },

    signatureLine: {
      borderBottom: '1pt solid #4A4A4A',
      marginBottom: 5,
      height: 30,
    },

    signatureLabel: {
      fontSize: 8,
      color: '#4A4A4A',
      textAlign: 'center',
    },

    // QR Code Section
    qrSection: {
      alignItems: 'center',
      marginBottom: 25,
      padding: 20,
      border: '1pt solid #E0E0E0',
      backgroundColor: '#F9F9F9',
    },

    qrTitle: {
      fontSize: 11,
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      color: '#1A1A1A',
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    qrCode: {
      width: 80,
      height: 80,
      marginBottom: 8,
    },

    qrDescription: {
      fontSize: 8,
      color: '#4A4A4A',
      textAlign: 'center',
      maxWidth: 200,
    },

    // Footer Section
    footer: {
      marginTop: 'auto',
    },

    footerInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 15,
      borderTop: '0.5pt solid #E0E0E0',
    },

    footerLeft: {
      flex: 1,
    },

    footerRight: {
      flex: 1,
      alignItems: 'flex-end',
    },

    pageNumber: {
      fontSize: 8,
      color: '#4A4A4A',
    },

    printTimestamp: {
      fontSize: 8,
      color: '#4A4A4A',
    },

    barcode: {
      fontSize: 8,
      color: '#4A4A4A',
      fontFamily: 'Courier',
      letterSpacing: 1,
    },

    thanksSection: {
      textAlign: 'center',
      padding: 20,
      marginTop: 15,
      backgroundColor: '#F9F9F9',
      borderTop: '1pt solid #E0E0E0',
      borderBottom: '1pt solid #E0E0E0',
    },

    thanksText: {
      fontSize: 14,
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      color: '#1A1A1A',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
  });

export const InvoicePDF = ({
  invoiceData,
  companyInfo,
  showSignatures = true,
  showWatermark = true,
  pageNumber = 1,
  totalPages = 1,

}) => {
  const styles = createStyles();

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
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        {showWatermark && companyInfo.watermark && (
          <View style={styles.watermark}>
            <Text>{companyInfo.watermark}</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          {/* Left Side: Logo + Company Info */}
          <View style={styles.leftHeader}>
            {companyInfo.logo && (
              <Image style={styles.logo} src={companyInfo.logo} />
            )}
            <View style={styles.companyDetails}>
              <Text style={styles.companyName}>{companyInfo.name}</Text>
              <Text style={styles.companyText}>{companyInfo.address}</Text>
              <Text style={styles.companyText}>Phone: {companyInfo.phone}</Text>
              <Text style={styles.companyText}>Email: {companyInfo.email}</Text>
              <Text style={styles.companyText}>
                Website: {companyInfo.website}
              </Text>
            </View>
          </View>

          {/* Right Side: Invoice Label and Number */}
          <View style={styles.rightHeader}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.invoiceNumberBox}>
              <Text>{invoiceData.invoiceNumber}</Text>
            </View>
          </View>
        </View>

        {/* Rest of the document remains unchanged */}
        <View style={styles.detailsSection}>
          <View style={styles.billToSection}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.customerName}>{invoiceData.customerName}</Text>
            <Text style={styles.customerDetails}>{invoiceData.address}</Text>
            <Text style={styles.customerDetails}>
              {invoiceData.customerPhone}
            </Text>
          </View>
          <View style={styles.invoiceMetaSection}>
            <View style={styles.metaTable}>
              <View style={styles.metaRow}>
                <View style={styles.metaLabelCell}>
                  <Text style={styles.metaLabel}>Invoice Number</Text>
                </View>
                <View style={styles.metaValueCell}>
                  <Text style={styles.metaValue}>
                    {invoiceData.invoiceNumber}
                  </Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaLabelCell}>
                  <Text style={styles.metaLabel}>Date of Issue</Text>
                </View>
                <View style={styles.metaValueCell}>
                  <Text style={styles.metaValue}>
                    {formatDate(invoiceData.createdAt)}
                  </Text>
                </View>
              </View>
              <View style={[styles.metaRow, styles.metaRowLast]}>
                <View style={styles.metaLabelCell}>
                  <Text style={styles.metaLabel}>Due Date</Text>
                </View>
                <View style={styles.metaValueCell}>
                  <Text style={styles.metaValue}>
                    {formatDate(invoiceData.dueDate)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={[styles.tableHeaderCell, styles.colDescription]}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colQty]}>
              <Text style={styles.tableHeaderText}>Qty</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.colRate]}>
              <Text style={styles.tableHeaderText}>Rate</Text>
            </View>
            <View
              style={[
                styles.tableHeaderCell,
                styles.colAmount,
                styles.tableHeaderCellLast,
              ]}
            >
              <Text style={styles.tableHeaderText}>Amount</Text>
            </View>
          </View>
          {invoiceData.items.length === 0 ? (
            <Text style={styles.noItems}>No items added</Text>
          ) : (
            invoiceData.items.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 1 && styles.tableRowAlternate,
                  index === invoiceData.items.length - 1 && styles.tableRowLast,
                ]}
              >
                <View style={[styles.tableCell, styles.colDescription]}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.itemDescription}>
                      {item.description}
                    </Text>
                  )}
                </View>
                <View style={[styles.tableCell, styles.colQty]}>
                  <Text style={styles.itemValue}>{item.quantity}</Text>
                </View>
                <View style={[styles.tableCell, styles.colRate]}>
                  <Text style={styles.itemValue}>
                    {formatCurrency(item.price)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.tableCell,
                    styles.colAmount,
                    styles.tableCellLast,
                  ]}
                >
                  <Text style={styles.itemAmount}>
                    {formatCurrency(item.quantity * item.price)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <View style={styles.totalLabelCell}>
                <Text style={styles.totalLabel}>Subtotal</Text>
              </View>
              <View style={styles.totalValueCell}>
                <Text style={styles.totalValue}>{invoiceData.subtotal}</Text>
              </View>
            </View>
            {invoiceData.discountAmount !== '$0.00' && (
              <View style={styles.totalRow}>
                <View style={styles.totalLabelCell}>
                  <Text style={styles.totalLabel}>Discount</Text>
                </View>
                <View style={styles.totalValueCell}>
                  <Text style={styles.totalValue}>
                    {invoiceData.discountAmount}
                  </Text>
                </View>
              </View>
            )}
            {invoiceData.taxAmount !== '$0.00' && (
              <View style={styles.totalRow}>
                <View style={styles.totalLabelCell}>
                  <Text style={styles.totalLabel}>Tax</Text>
                </View>
                <View style={styles.totalValueCell}>
                  <Text style={styles.totalValue}>{invoiceData.taxAmount}</Text>
                </View>
              </View>
            )}
            <View style={[styles.totalRow, styles.finalTotalRow]}>
              <View style={styles.totalLabelCell}>
                <Text style={styles.finalTotalLabel}>Total</Text>
              </View>
              <View style={styles.totalValueCell}>
                <Text style={styles.finalTotalValue}>{invoiceData.total}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoiceData.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoiceData.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        {showSignatures && (
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Authorized Signature</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Signature</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Customer Signature</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Signature</Text>
            </View>
          </View>
        )}

        {/* QR Code */}
        {invoiceData.paymentMethod === 'KHQR' &&
          invoiceData.paymentData?.transactionData && (
            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>Payment QR Code</Text>

              <Image
                style={styles.qrCode}
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                  invoiceData.paymentData.transactionData.rawQR
                )}&size=100x100`}
              />
              <Text style={styles.qrDescription}>
                Scan to make payment for Invoice #{invoiceData.paymentData.id}
              </Text>
            </View>
          )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <View style={styles.footerLeft}>
              <Text style={styles.pageNumber}>
                Page {pageNumber} of {totalPages}
              </Text>
              {invoiceData.referenceId && (
                <Text style={styles.barcode}>
                  REF: {generateBarcode(invoiceData.referenceId)}
                </Text>
              )}
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.printTimestamp}>
                Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
              </Text>
            </View>
          </View>
          <View style={styles.thanksSection}>
            <Text style={styles.thanksText}>Thank You For Your Business</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
