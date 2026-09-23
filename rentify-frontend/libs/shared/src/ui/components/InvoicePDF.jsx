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
  websiteName,
  phoneNumber,
  billTo,
  customerTel,
  street,
  district,
  province,
  paymentStatus,
}) => {
  console.log(paymentStatus, 3);

  const invoiceDate = format(new Date(order.createdAt), 'dd/MM/yyyy');
  const dueDate = format(new Date(order.createdAt), 'dd/MM/yyyy');

  // Calculate order totals
  const subtotal = order.OrderItems.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );
  const discount = subtotal - parseFloat(order.totalAmount);

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
            <Text>{billTo}</Text>
            {customerTel && <Text>{customerTel}</Text>}
            <Text>
              {street}
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
            <Text>Terms: {order.paymentMethod}</Text>
            <Text>
              Payment Status: {paymentStatus === 'pending' ? 'Pending' : 'Paid'}
            </Text>
          </View>
          <View>
            <Text>Invoice No.: {order.id}</Text>
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

          {order.OrderItems.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={styles.colDescription}>{item.Product.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colRate}>
                ${parseFloat(item.price).toFixed(2)}
              </Text>
              <Text style={styles.colAmount}>
                ${(item.quantity * item.price).toFixed(2)}
              </Text>
            </View>
          ))}
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
              ${order.totalAmount}
            </Text>
          </View>
        </View>

        {/* KHQR */}
        {/* KHQR Section */}
        {order.paymentMethod === 'KHQR' &&
          order.payment?.qrRaw &&
          paymentStatus !== 'completed' && (
            <View style={styles.khqrContainer}>
              <Image
                style={styles.khqrImage}
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                  order.payment.qrRaw
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
