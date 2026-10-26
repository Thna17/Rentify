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

export const InvoicePDF = ({
  order,
  invoiceData,
  websiteName = 'Rentify Store',
  phoneNumber = '',
  billTo,
  customerTel,
  street,
  district,
  province,
  paymentStatus,
}) => {
  const data = order || invoiceData || {};
  const items = data.OrderItems || data.items || data.lineItems || [];

  const invoiceDate = data.createdAt
    ? format(new Date(data.createdAt), 'dd/MM/yyyy')
    : format(new Date(), 'dd/MM/yyyy');
  const dueDate = data.dueDate
    ? format(new Date(data.dueDate), 'dd/MM/yyyy')
    : invoiceDate;

  const invoiceNum =
    data.invoiceNumber ||
    data.Invoice?.invoiceNumber ||
    data.orderNumber ||
    data.id ||
    'INV-0001';

  const effectiveBillTo =
    billTo ||
    data.customer?.name ||
    data.customerInfo?.name ||
    data.customerName ||
    'Valued Customer';
  const effectiveTel =
    customerTel ||
    data.customer?.phone ||
    data.customerInfo?.phone ||
    phoneNumber ||
    '';

  const subtotal =
    data.totals?.subtotal !== undefined
      ? parseFloat(data.totals.subtotal)
      : data.subtotal !== undefined
      ? parseFloat(data.subtotal)
      : items.reduce(
          (sum, item) =>
            sum + parseFloat(item.price || item.unitPrice || 0) * (item.quantity || 1),
          0
        );

  const totalAmount =
    data.totals?.total !== undefined
      ? parseFloat(data.totals.total)
      : data.totalAmount !== undefined
      ? parseFloat(data.totalAmount)
      : data.total !== undefined
      ? parseFloat(data.total)
      : subtotal;

  const discount = Math.max(0, subtotal - totalAmount);
  const effectiveStatus =
    paymentStatus || data.status || (data.stockState?.stockDeducted ? 'paid' : 'pending');

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
            {websiteName}
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.row}>
            <View>
              <Text style={styles.companyInfo}>{websiteName}</Text>
              {/* <Text>(Testing invoice)</Text> */}
              <Text>Tel: {phoneNumber}</Text>
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
            <Text>{effectiveBillTo}</Text>
            {effectiveTel ? <Text>{effectiveTel}</Text> : null}
            <Text>
              {street || ''}
              {district || province
                ? `, ${[district, province].filter(Boolean).join(', ')}`
                : ''}
            </Text>
          </View>
        </View>

        {/* Invoice Meta */}
        <View style={styles.row}>
          <View>
            <Text>Date (DD/MM/YYYY): {invoiceDate}</Text>
            <Text>Terms: {data.paymentMethod || data.totals?.currency || 'Cash / COD'}</Text>
            <Text>
              Payment Status: {effectiveStatus === 'paid' || effectiveStatus === 'completed' ? 'Paid' : 'Pending'}
            </Text>
          </View>
          <View>
            <Text>Invoice No.: {invoiceNum}</Text>
            <Text>Due Date: {dueDate}</Text>
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

          {items.map((item, idx) => {
            const price = parseFloat(item.price || item.unitPrice || 0);
            const qty = item.quantity || 1;
            const lineTotal = item.total || item.totalPrice || price * qty;
            const name = item.name || item.Product?.name || 'Line Item';
            return (
              <View style={styles.tableRow} key={item.id || idx}>
                <Text style={styles.colDescription}>{name}</Text>
                <Text style={styles.colQty}>{qty}</Text>
                <Text style={styles.colRate}>${price.toFixed(2)}</Text>
                <Text style={styles.colAmount}>${parseFloat(lineTotal).toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>-${discount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { fontSize: 12 }]}>Total</Text>
            <Text style={[styles.totalValue, { fontSize: 12 }]}>
              ${totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* KHQR */}
        {/* KHQR Section */}
        {(data.paymentMethod === 'KHQR' || order?.paymentMethod === 'KHQR') &&
          (order?.payment?.qrRaw || data.paymentEvidence?.transactionData?.qrRaw) &&
          effectiveStatus !== 'completed' &&
          effectiveStatus !== 'paid' && (
            <View style={styles.khqrContainer}>
              <Image
                style={styles.khqrImage}
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                  order?.payment?.qrRaw || data.paymentEvidence?.transactionData?.qrRaw
                )}&size=100x100`}
              />
              <Text style={styles.khqrLabel}>Scan to Pay (KHQR)</Text>
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

export default InvoicePDF;
