import { useTranslation } from '@rentify/utils';

import { 
  Download, 
  Eye, 
  Save, 
  Settings, 
  FileText, 
  Bell
} from 'lucide-react';
// Shadcn components
import { Alert, AlertTitle, AlertDescription } from '@rentify/shared/ui/alert';
import { Button } from '@rentify/shared/ui/button';
import { motion } from 'framer-motion';
import { Label } from '@rentify/shared/ui/label';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@rentify/shared/ui/Sheet';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@rentify/shared/ui/Popover';
import { Switch } from '@rentify/shared/ui/switch';
import { useState } from 'react';
import { pdf, PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePDF } from '@rentify/shared/ui/components/InvoicePDF';
import { InvoicePreview } from './components/InvoicePreview';
import { InvoiceForm } from './components/InvoiceForm';
import { ShareButton } from './components/ShareButton';
import { useCreateInvoiceMutation } from '@rentify/apis';
import { useInvoice }  from '../../hooks/useInvoice';
import { useNotification }  from '../../hooks/useNotification';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

const INITIAL_INVOICE_DATA = {
  invoiceNumber: `INV-${Date.now()}`,
  customerName: '',
  customerPhone: '',
  address: '',
  createdAt: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0],
  items: [],
  subtotal: '$0.00',
  discount: 0,
  discountAmount: '$0.00',
  tax: 0,
  taxAmount: '$0.00',
  taxType: 'none',
  vatAmount: '$0.00',
  total: '$0.00',
  paymentMethod: 'cash',
};


export const InvoiceManual = () => {
  const { t } = useTranslation();
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSignatures, setShowSignatures] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const { websiteData, isLoading } = useThemeService();
  const websiteId = websiteData.websiteId;
  
  const [createInvoice] = useCreateInvoiceMutation();

  const {
    invoiceData,
    updateField,
    addItem,
    updateItem,
    removeItem,
    handleCustomerSelect,
  } = useInvoice(INITIAL_INVOICE_DATA);

  const {
    showNotification,
    notificationMessage,
    notificationType,
    showSuccess,
    showError,
  } = useNotification();

  const websiteName = 'Brathna Store';

  const companyInfo = {
    name: 'Rentify',
    address: '456 Tech Avenue, Suite 200, San Francisco, CA 94102',
    phone: '+1 (555) 987-6543',
    email: 'hello@rentify.com',
    website: 'www.rentify.com',
    watermark: 'Rentify',
    logo: 'https://i.ibb.co/hFhZHpkh/Logo.png',
  };

  const handleSaveInvoice = async () => {
    setIsSaving(true);
    try {
      // Validate required fields
      if (!invoiceData.customerName || invoiceData.items.length === 0) {
        throw new Error(
          invoiceData.customerName
            ? t('dashboard.invoices.error_no_items')
            : t('dashboard.invoices.error_customer_name')
        );
      }

      // Generate PDF
      const pdfBlob = await pdf(
        <InvoicePDF
          invoiceData={invoiceData}
          websiteName={websiteName}
          companyInfo={companyInfo}
          showSignatures={showSignatures}
          showWatermark={showWatermark}
          pageNumber={1}
          totalPages={1}
        />
      ).toBlob();

      // Create FormData for upload
      const formDataToUpload = new FormData();
      formDataToUpload.append(
        'pdf',
        pdfBlob,
        `invoice-${invoiceData.invoiceNumber}.pdf`
      );

      // Upload PDF to server
      const uploadRes = await fetch(
        `${__API_URL__}/api/websites/upload-pdf/${websiteId}`,
        {
          method: 'POST',
          body: formDataToUpload,
        }
      );

      if (!uploadRes.ok) {
        throw new Error(t('dashboard.invoices.error_pdf_upload_failed'));
      }

      const uploadData = await uploadRes.json();
      const pdfUrl = uploadData.url;

      // Prepare invoice data for backend
      const invoicePayload = {
        ...invoiceData,
        items: invoiceData.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
          total: item.quantity * item.price,
          productId: item?.productId,
        })),
        subtotal: parseFloat(invoiceData.subtotal.replace('$', '')),
        discountAmount: parseFloat(
          invoiceData.discountAmount.replace('$', '')
        ),
        taxAmount: parseFloat(invoiceData.taxAmount.replace('$', '')),
        total: parseFloat(invoiceData.total.replace('$', '')),
        pdfUrl,
        paymentMethod: invoiceData.paymentMethod,
        dueDate: invoiceData.dueDate,
        notes: invoiceData.notes || '',
      };

      // Send to backend
      const response = await createInvoice({
        websiteId,
        body: invoicePayload,
      }).unwrap();

      setIsSaved(true);
      showSuccess(t('dashboard.invoices.success_message'));

      // Update with server-generated values
      updateField('id', response.invoice.id);
      updateField('invoiceNumber', response.invoice.invoiceNumber);
      updateField('pdfUrl', response.invoice.pdfUrl);
      updateField('status', response.invoice.status);
      updateField('paymentData', response.paymentData);
    } catch (error) {
      console.error('Failed to save invoice:', error);
      showError(
        error.data?.message ||
          error.message ||
          t('dashboard.invoices.error_save_failed')
      );
    } finally {
      setIsSaving(false);
    }
  };

   const HeaderActions = () => (
    <div className="flex flex-wrap gap-3">
      {!isSaved ? (
        <Button 
          onClick={handleSaveInvoice}
          disabled={isSaving}
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
        >
          {isSaving ? (
            <>
              <Save className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Invoice
            </>
          )}
        </Button>
      ) : (
        <>
          <PDFDownloadLink
            document={
              <InvoicePDF
                invoiceData={invoiceData}
                websiteName={websiteName}
                companyInfo={companyInfo}
                showSignatures={showSignatures}
                showWatermark={showWatermark}
                pageNumber={1}
                totalPages={1}
              />
            }
            fileName={`invoice-${invoiceData.invoiceNumber}.pdf`}
          >
            {({ loading }) => (
              <Button
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md"
              >
                {loading ? (
                  <>
                    <Download className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </Button>
            )}
          </PDFDownloadLink>
          
          <ShareButton
            invoiceData={invoiceData}
            websiteName={websiteName}
            companyInfo={companyInfo}
          />
        </>
      )}

      <Button 
        variant="outline" 
        onClick={() => setMobilePreviewOpen(true)}
        className="flex items-center gap-2 shadow-sm lg:hidden"
      >
        <Eye className="w-4 h-4" />
        Preview
      </Button>
    </div>
  );
  return (
   <div className="min-h-full">
        {/* Notification */}
              <PageHeader
        title="Invoice Generator"
        description="Create professional invoices with ease"
        icon={FileText}
        actions={<HeaderActions />}
        breadcrumb={[
          { label: 'Dashboard', href: '/overview' },
          { label: 'Invoices' },
          { label: 'Create Invoice' }
        ]}
      />
        {showNotification && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            <Alert variant={notificationType === 'success' ? 'default' : 'destructive'}>
              <Bell className="h-4 w-4" />
              <AlertTitle>{notificationType === 'success' ? 'Success' : 'Error'}</AlertTitle>
              <AlertDescription>{notificationMessage}</AlertDescription>
            </Alert>
          </div>
        )}
         <div className="p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Invoice Details
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Fill in the invoice information
                  </p>
                </div>
              </div>
              
              <InvoiceForm
                invoiceData={invoiceData}
                updateField={updateField}
                addItem={addItem}
                updateItem={updateItem}
                removeItem={removeItem}
                handleCustomerSelect={handleCustomerSelect}
              />
            </motion.div>

            {/* Preview Section - Hidden on Mobile */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                    <Eye className="w-5 h-5 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Live Preview
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Real-time invoice preview
                    </p>
                  </div>
                </div>

                {/* Options Button */}
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Options
                </Button>
              </div>
              
              <InvoicePreview
                invoiceData={invoiceData}
                websiteName={websiteName}
                companyInfo={companyInfo}
                showSignatures={showSignatures}
                showWatermark={showWatermark}
                pageNumber={1}
                totalPages={1}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>

       <Sheet open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Invoice Preview</SheetTitle>
          </SheetHeader>
          <InvoicePreview
            invoiceData={invoiceData}
            websiteName={websiteName}
            companyInfo={companyInfo}
            showSignatures={showSignatures}
            showWatermark={showWatermark}
            pageNumber={1}
            totalPages={1}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default InvoiceManual;
