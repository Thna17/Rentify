import React from 'react';
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bold: {
    fontWeight: 'bold',
  },
  companyInfo: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 14,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  section: {
    marginVertical: 6,
  },
  tableContainer: {
    border: '1px solid black',
    marginTop: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
    backgroundColor: '#eee',
    padding: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #ccc',
    padding: 4,
  },
  colDescription: { width: '40%' },
  colQty: { width: '10%', textAlign: 'right' },
  colRate: { width: '15%', textAlign: 'right' },
  colAmount: { width: '15%', textAlign: 'right' },
  totalSection: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  totalLabel: {
    width: '80%',
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    width: '20%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  khqrContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  khqrImage: {
    width: 100,
    height: 100,
  },
  khqrLabel: {
    marginTop: 4,
    fontSize: 10,
  },
  footerSection: {
    marginTop: 40,
    borderTop: '1px solid #ccc',
    paddingTop: 10,
  },
  supportInfo: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  stampBox: {
    height: 60,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#999',
    marginTop: 4,
    width: 180,
  },
  thankYouNote: {
    marginTop: 50,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export const InvoiceDocument = ({ invoiceData, websiteName }) => {
  const safeWebsiteName = websiteName || 'Business Name';
  
  const formatDate = (dateString) => {
    try {
      return dateString ? format(new Date(dateString), 'dd/MM/yyyy') : '';
    } catch (e) {
      return '';
    }
  };

    const {
    invoiceNumber,
    customerName,
    customerPhone,
    address,
    createdAt,
    dueDate,
    items,
    subtotal,
    discount,
    discountAmount,
    tax,
    taxAmount,
    total,
    paymentMethod
  } = invoiceData;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View
          style={{
            position: 'absolute',
            top: '30%',

            transform: 'rotate(-45deg)',
          }}
        >
          <Text
            style={{
              fontSize: 50,
              color: '#dddddd',
              opacity: 0.2,
              fontWeight: 'bold',
              letterSpacing: 2,
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            {safeWebsiteName}
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.row}>
            <View>
              <Text style={styles.companyInfo}>{websiteName}</Text>
              {/* <Text>(Testing invoice)</Text> */}
              {/* <Text>Tel: {phoneNumber}</Text> */}
              <Text>{'myshop.com'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <Text style={{ fontSize: 8, color: 'gray' }}>
                Powered by Choulweb (Rentify Platform)
              </Text>
            </View>
          </View>
        </View>

        {/* Billing Info */}

        <View style={[styles.section, { marginBottom: 8 }]}>
          <Text style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>
            BILL TO
          </Text>
          <View>
            <Text>{invoiceData.customerName}</Text>
            {invoiceData.customerPhone && (
              <Text>Phone: {invoiceData.customerPhone}</Text>
            )}
            {invoiceData.address && <Text>Address: {invoiceData.address}</Text>}
          </View>
        </View>

        {/* Invoice Meta */}
        <View style={styles.row}>
          <View>
            <Text>Invoice Number: {invoiceData.invoiceNumber}</Text>
            <Text>Date: {formatDate(invoiceData.createdAt)}</Text>
            <Text>Due Date: {formatDate(invoiceData.dueDate)}</Text>
            {/* <Text>Payment Method: {invoiceData.paymentMethod.toUpperCase()}</Text> */}
          </View>
          <View>
            {/* <Text>Invoice No.: {order.id}</Text> */}
            {/* <Text>Due Date: {dueDate}</Text> */}
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Price</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>

          {invoiceData.items.map((item, index) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={styles.colDescription}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colRate}>${item.price}</Text>
              <Text style={styles.colAmount}>
                ${(item.quantity * item.price).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{invoiceData.subtotal}</Text>
          </View>

          {invoiceData.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Discount ({invoiceData.discount}%):
              </Text>
              <Text style={styles.totalValue}>
                {invoiceData.discountAmount}
              </Text>
            </View>
          )}

          {invoiceData.taxType === 'vat' && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT (10%):</Text>
              <Text style={styles.totalValue}>{invoiceData.vatAmount}</Text>
            </View>
          )}

          <View style={[styles.totalRow, { marginTop: 5 }]}>
            <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>
              Total:
            </Text>
            <Text style={[styles.totalValue, { fontWeight: 'bold' }]}>
              {invoiceData.total}
            </Text>
          </View>
        </View>

        {/* KHQR */}
        {/* KHQR Section */}
        {invoiceData.paymentMethod === 'KHQR' && (
          <View style={styles.khqrContainer}>
            <Text style={styles.khqrLabel}>Scan to Pay via KHQR:</Text>
            <Image
              style={styles.khqrImage}
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                `Amount: ${invoiceData.total}`
              )}&size=100x100`}
            />
          </View>
        )}

        {/* Footer Confirmation */}
        <View style={styles.footerSection}>
          {/* <Text style={styles.supportInfo}>
          This invoice was automatically generated by Rentify’s eCommerce platform (Choulweb)
          when a customer made a purchase from the website of a Rentify client.
        </Text> */}
          <Text style={styles.supportInfo}>
            Note: Products are non-refundable unless defective. Contact support
            within 3 days for any issues.
          </Text>
          <Text style={styles.supportInfo}>
            For questions or support, contact: support@choulweb.com | +855 98
            360 698
          </Text>
          <Text style={styles.supportInfo}>Visit us: www.choulweb.com</Text>

          <Text style={[styles.supportInfo, { marginTop: 10 }]}>
            Business Stamp / Authorized Confirmation:
          </Text>
          <View style={styles.stampBox} />
        </View>
        <Text style={styles.thankYouNote}>Thank you for your order!</Text>
      </Page>
    </Document>
  );
};

