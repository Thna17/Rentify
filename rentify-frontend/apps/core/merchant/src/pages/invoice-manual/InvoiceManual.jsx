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
} from '@rentify/shared/ui/sheet';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@rentify/shared/ui/popover';
import { Switch } from '@rentify/shared/ui/switch';
import { useState } from 'react';
import { pdf, PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePDF } from './components/InvoicePDF';
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
    <div className="flex flex-wrap items-center gap-3">
      {!isSaved ? (
        <Button 
          onClick={handleSaveInvoice}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs rounded-lg px-4 h-11 sm:h-10 transition-colors"
        >
          {isSaving ? (
            <>
              <Save className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{t('merchant.p2.saveInvoice')}</span>
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
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs rounded-lg px-4 h-11 sm:h-10 transition-colors"
              >
                {loading ? (
                  <>
                    <Download className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{t('merchant.p2.downloadPdf')}</span>
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
        className="flex items-center gap-2 shadow-xs lg:hidden rounded-lg h-11 sm:h-10"
      >
        <Eye className="w-4 h-4" />
        <span>{t('merchant.p2.preview')}</span>
      </Button>
    </div>
  );
  return (
   <div className="min-h-full">
      {/* Notification */}
      <PageHeader
        title={t('merchant.p2.invoiceGenerator')}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Section */}
          {/* Phones: every field gets a 44px touch target; bigger screens keep the compact size */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6 [&_input]:min-h-11 sm:[&_input]:min-h-0 [&_[role=combobox]]:min-h-11 sm:[&_[role=combobox]]:min-h-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t('merchant.p2.invoiceDetails')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('merchant.p2.configureInvoiceDataRecipient')}
                  </p>
                </div>
              </div>
              <span className="shrink-0 whitespace-nowrap text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium border border-border/50">
                {invoiceData.items.length} {invoiceData.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            
            <InvoiceForm
              invoiceData={invoiceData}
              updateField={updateField}
              addItem={addItem}
              updateItem={updateItem}
              removeItem={removeItem}
              handleCustomerSelect={handleCustomerSelect}
            />
          </div>

          {/* Preview Section - Sticky on Desktop */}
          <div className="hidden lg:block lg:col-span-6 xl:col-span-5 sticky top-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Eye className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {t('merchant.p2.documentPreview')}
                    </h3>
                    <span className="text-2xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                      {t('merchant.p2.liveA4')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('merchant.p2.realTimeDocumentPreview')}
                  </p>
                </div>
              </div>

              {/* Options Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 text-xs h-9 rounded-lg shadow-xs hover:bg-muted/80">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span>{t('merchant.p2.options')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-4 space-y-3">
                  <div className="border-b border-border pb-2">
                    <h4 className="font-semibold text-sm">{t('merchant.p2.previewOptions')}</h4>
                    <p className="text-xs text-muted-foreground">{t('merchant.p2.customizeInvoiceAppearance')}</p>
                  </div>
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-watermark" className="text-xs font-medium cursor-pointer">{t('merchant.p2.watermark')}</Label>
                      <Switch id="toggle-watermark" checked={showWatermark} onCheckedChange={setShowWatermark} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-signatures" className="text-xs font-medium cursor-pointer">{t('merchant.p2.signatures')}</Label>
                      <Switch id="toggle-signatures" checked={showSignatures} onCheckedChange={setShowSignatures} />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Ambient Preview Canvas */}
            <div className="p-4 md:p-6 rounded-2xl bg-muted/40 border border-border/70 flex justify-center items-center shadow-inner">
              <InvoicePreview
                invoiceData={invoiceData}
                websiteName={websiteName}
                companyInfo={companyInfo}
                showSignatures={showSignatures}
                showWatermark={showWatermark}
                pageNumber={1}
                totalPages={1}
              />
            </div>
          </div>
        </div>
      </div>

      <Sheet open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto bg-muted/30">
          <SheetHeader className="mb-6">
            <SheetTitle>{t('merchant.p2.invoicePreview')}</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center p-2">
            <InvoicePreview
              invoiceData={invoiceData}
              websiteName={websiteName}
              companyInfo={companyInfo}
              showSignatures={showSignatures}
              showWatermark={showWatermark}
              pageNumber={1}
              totalPages={1}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default InvoiceManual;
