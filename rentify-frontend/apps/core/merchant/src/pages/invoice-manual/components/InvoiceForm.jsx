import { BasicInformationForm } from './BasicInformationForm';
import { CustomerInformationForm } from './CustomerInformationForm';
import { InvoiceItemsForm } from './InvoiceItemsForm';
import { TaxDiscountForm } from './TaxDiscountForm';
export const InvoiceForm = ({ invoiceData, updateField, addItem, updateItem, removeItem, handleCustomerSelect }) => {
  return (
    <div className="space-y-6">
      <BasicInformationForm invoiceData={invoiceData} updateField={updateField} />
      <CustomerInformationForm
        invoiceData={invoiceData}
        updateField={updateField}
        handleCustomerSelect={handleCustomerSelect}
      />
      <InvoiceItemsForm
        invoiceData={invoiceData}
        addItem={addItem}
        updateItem={updateItem}
        removeItem={removeItem}
      />
      <TaxDiscountForm invoiceData={invoiceData} updateField={updateField} />
    </div>
  );
};