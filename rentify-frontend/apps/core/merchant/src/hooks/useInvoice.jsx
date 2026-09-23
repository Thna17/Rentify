import { useState, useEffect, useCallback } from 'react';

export const useInvoice = (initialData) => {
  const [invoiceData, setInvoiceData] = useState(initialData);

  const updateField = useCallback((field, value) => {
    setInvoiceData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addItem = useCallback((itemData) => {
    const newItem = {
      id: Date.now().toString(),
      ...itemData,
    };
    setInvoiceData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  }, []);

  const updateItem = useCallback((id, field, value) => {
    setInvoiceData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }, []);

  const removeItem = useCallback((id) => {
    setInvoiceData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, []);

  const handleCustomerSelect = useCallback((customer) => {
    setInvoiceData((prev) => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone,
      address: customer.address,
    }));
  }, []);

  const calculateTotals = useCallback(() => {
    const subtotalAmount = invoiceData.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    const discountAmount = subtotalAmount * (invoiceData.discount / 100);
    const afterDiscount = subtotalAmount - discountAmount;

    let taxAmount = 0;
    let vatAmount = 0;

    if (invoiceData.taxType === 'vat') {
      vatAmount = afterDiscount * 0.1;
      taxAmount = vatAmount;
    }

    const total = afterDiscount + taxAmount;

    setInvoiceData((prev) => ({
      ...prev,
      subtotal: `$${subtotalAmount.toFixed(2)}`,
      discountAmount: `$${discountAmount.toFixed(2)}`,
      taxAmount: `$${taxAmount.toFixed(2)}`,
      vatAmount: `$${vatAmount.toFixed(2)}`,
      total: `$${total.toFixed(2)}`,
    }));
  }, [invoiceData.items, invoiceData.discount, invoiceData.taxType]);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  return {
    invoiceData,
    updateField,
    addItem,
    updateItem,
    removeItem,
    handleCustomerSelect,
  };
};

export default useInvoice;