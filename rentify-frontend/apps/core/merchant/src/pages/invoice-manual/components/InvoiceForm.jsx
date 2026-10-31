import { BasicInformationForm } from './BasicInformationForm';
import { CustomerInformationForm } from './CustomerInformationForm';
import { InvoiceItemsForm } from './InvoiceItemsForm';
import { TaxDiscountForm } from './TaxDiscountForm';
export const InvoiceForm = ({ invoiceData, updateField, addItem, updateItem, removeItem, handleCustomerSelect }) => {
  return (
    <div className="space-y-6">
      {/* Redesign M15 order: who, what, when and how they pay, then the optional extras */}
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
      <BasicInformationForm invoiceData={invoiceData} updateField={updateField} />
      <TaxDiscountForm invoiceData={invoiceData} updateField={updateField} />
    </div>
  );
};