import React, { useState, useMemo } from 'react';
import { useTranslation } from '@rentify/utils';
import {
  Download,
  Eye,
  Save,
  Settings,
  FileText,
  Bell,
  Plus,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Receipt,
  ExternalLink,
} from 'lucide-react';

// Shadcn components
import { Alert, AlertTitle, AlertDescription } from '@rentify/shared/ui/alert';
import { Button } from '@rentify/shared/ui/button';
import { Label } from '@rentify/shared/ui/label';
import { Badge } from '@rentify/shared/ui/badge';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@rentify/shared/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@rentify/shared/ui/popover';
import { Switch } from '@rentify/shared/ui/switch';
import { pdf, PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePDF } from './components/InvoicePDF';
import { InvoicePreview } from './components/InvoicePreview';
import { InvoiceForm } from './components/InvoiceForm';
import { ShareButton } from './components/ShareButton';
import {
  useCreateInvoiceMutation,
  useGetInvoicesQuery,
} from '@rentify/apis';
import { useInvoice } from '../../hooks/useInvoice';
import { useNotification } from '../../hooks/useNotification';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { useChannels } from '../../context/ChannelContext';

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

const WORK_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'paid', label: 'Paid' },
  { id: 'drafts', label: 'Drafts' },
];

export const InvoiceManual = () => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('list');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSignatures, setShowSignatures] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);

  const { websiteData } = useThemeService();
  const websiteId = websiteData?.websiteId;

  // Invoice Query for M14 List
  const {
    data: invoicesResponse,
    isLoading: isLoadingInvoices,
    isError: isErrorInvoices,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery({ websiteId }, { skip: !websiteId });

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
  const { store } = useChannels();
  const companyInfo = {
    name: store?.name || 'Rentify',
    address: '456 Tech Avenue, Suite 200, San Francisco, CA 94102',
    phone: '+1 (555) 987-6543',
    email: 'hello@rentify.com',
    website: store?.slug ? `${store.slug}.mekhla.digital` : 'www.rentify.com',
    watermark: store?.name || 'Rentify',
    logo: store?.logoUrl || 'https://i.ibb.co/hFhZHpkh/Logo.png',
  };

  const handleSaveInvoice = async () => {
    setIsSaving(true);
    try {
      if (!invoiceData.customerName || invoiceData.items.length === 0) {
        throw new Error(
          invoiceData.customerName
            ? t('dashboard.invoices.error_no_items')
            : t('dashboard.invoices.error_customer_name')
        );
      }

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

      const formDataToUpload = new FormData();
      formDataToUpload.append(
        'pdf',
        pdfBlob,
        `invoice-${invoiceData.invoiceNumber}.pdf`
      );

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

      const response = await createInvoice({
        websiteId,
        body: invoicePayload,
      }).unwrap();

      setIsSaved(true);
      showSuccess(t('dashboard.invoices.success_message'));

      updateField('id', response.invoice.id);
      updateField('invoiceNumber', response.invoice.invoiceNumber);
      updateField('pdfUrl', response.invoice.pdfUrl);
      updateField('status', response.invoice.status);
      updateField('paymentData', response.paymentData);
      refetchInvoices();
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

  // Extracted list of invoices
  const rawInvoices = useMemo(() => {
    if (!invoicesResponse) return [];
    if (Array.isArray(invoicesResponse)) return invoicesResponse;
    if (Array.isArray(invoicesResponse.invoices)) return invoicesResponse.invoices;
    if (Array.isArray(invoicesResponse.data)) return invoicesResponse.data;
    return [];
  }, [invoicesResponse]);

  // Filtered invoices by activeTab and search
  const filteredInvoices = useMemo(() => {
    return rawInvoices.filter((inv) => {
      const status = String(inv.status || '').toLowerCase();
      if (activeTab === 'unpaid' && status !== 'unpaid' && status !== 'pending') return false;
      if (activeTab === 'paid' && status !== 'paid') return false;
      if (activeTab === 'drafts' && status !== 'draft') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const number = String(inv.invoiceNumber || '').toLowerCase();
        const customer = String(inv.customer?.name || inv.customerName || '').toLowerCase();
        return number.includes(q) || customer.includes(q);
      }
      return true;
    });
  }, [rawInvoices, activeTab, searchQuery]);

  // Render M14: Invoices List View
  if (viewMode === 'list') {
    return (
      <div className="min-h-full">
        <PageHeader
          title="Invoices"
          description="Send bills to customers and track payments"
          icon={Receipt}
          actions={
            <Button
              onClick={() => {
                setIsSaved(false);
                setViewMode('new');
              }}
              className="min-h-[44px] px-5 bg-primary text-primary-foreground font-medium shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New invoice</span>
            </Button>
          }
          breadcrumb={[
            { label: 'Dashboard', href: '/overview' },
            { label: 'Invoices' },
          ]}
        />

        <div className="p-4 sm:p-6 md:p-8 space-y-5 max-w-5xl">
          {/* Work Tabs (Screen M14) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[var(--rentify-color-border-subtle,#ece8e1)]">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {WORK_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-[40px] px-4 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 rounded-xl border border-[var(--rentify-color-border-subtle,#ece8e1)]"
              />
            </div>
          </div>

          {/* Invoices List / Content State */}
          {isLoadingInvoices ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card p-4 flex items-center justify-between"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32 rounded-lg" />
                    <Skeleton className="h-4 w-48 rounded-lg" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="h-5 w-16 ml-auto rounded-lg" />
                    <Skeleton className="h-4 w-12 ml-auto rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : isErrorInvoices ? (
            <div className="rounded-2xl border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card p-10 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="font-semibold text-foreground text-sm">Failed to load invoices</p>
              <Button variant="outline" onClick={() => refetchInvoices()} className="min-h-[44px]">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="rounded-2xl border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card p-12 text-center space-y-3 shadow-[var(--shadow-soft)]">
              <div className="p-3 bg-muted/30 text-muted-foreground rounded-2xl w-fit mx-auto border border-border/40">
                <Receipt className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-foreground">No invoices yet</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Create an invoice to send a bill to a customer and track when it gets paid.
                </p>
              </div>
              <Button
                onClick={() => {
                  setIsSaved(false);
                  setViewMode('new');
                }}
                className="min-h-[44px] px-5 mt-2 bg-primary text-primary-foreground font-medium shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New invoice
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredInvoices.map((inv) => {
                const invNumber = inv.invoiceNumber || `INV-${inv.id}`;
                const customer = inv.customer?.name || inv.customerName || 'Customer';
                const totalAmount = inv.total || inv.pricing?.total || 0;
                const status = String(inv.status || 'unpaid').toLowerCase();
                const isPaid = status === 'paid';
                const isDraft = status === 'draft';

                return (
                  <Card
                    key={inv.id || invNumber}
                    className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)] hover:bg-muted/10 transition-colors"
                  >
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {invNumber}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {customer} · {isPaid ? 'Paid' : `Due ${inv.dueDate || 'in 30 days'}`}
                        </p>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <p className="font-mono font-bold text-sm sm:text-base text-foreground">
                          ${Number(totalAmount).toFixed(2)}
                        </p>
                        {isPaid ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-2xs px-2 py-0.5">
                            Paid
                          </Badge>
                        ) : isDraft ? (
                          <Badge variant="secondary" className="text-2xs px-2 py-0.5 text-muted-foreground">
                            Draft
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-2xs px-2 py-0.5">
                            Unpaid
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render M15: New Invoice Form View
  return (
    <div className="min-h-full">
      <PageHeader
        title="New invoice"
        description="Create and send a bill to your customer"
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setViewMode('list')}
              className="min-h-[44px] px-3.5 gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Invoices</span>
            </Button>

            {!isSaved ? (
              <Button
                onClick={handleSaveInvoice}
                disabled={isSaving}
                className="min-h-[44px] px-5 bg-primary text-primary-foreground font-medium shadow-sm flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Save className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save and send</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
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
                      className="min-h-[44px] px-4 bg-primary text-primary-foreground font-medium shadow-sm flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </Button>
                  )}
                </PDFDownloadLink>

                <ShareButton
                  invoiceData={invoiceData}
                  websiteName={websiteName}
                  companyInfo={companyInfo}
                />
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setMobilePreviewOpen(true)}
              className="min-h-[44px] px-3.5 lg:hidden"
            >
              <Eye className="w-4 h-4" />
              <span className="ml-1.5">Preview</span>
            </Button>
          </div>
        }
        breadcrumb={[
          { label: 'Dashboard', href: '/overview' },
          { label: 'Invoices', href: '#' },
          { label: 'New invoice' },
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

      <div className="p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Section */}
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

          {/* Desktop Preview Section */}
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
                      Live A4
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Real-time document preview
                  </p>
                </div>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 text-xs h-9 rounded-lg">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span>Options</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-4 space-y-3">
                  <div className="border-b border-border pb-2">
                    <h4 className="font-semibold text-sm">Preview options</h4>
                    <p className="text-xs text-muted-foreground">Customize invoice appearance</p>
                  </div>
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-watermark" className="text-xs font-medium cursor-pointer">Watermark</Label>
                      <Switch id="toggle-watermark" checked={showWatermark} onCheckedChange={setShowWatermark} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-signatures" className="text-xs font-medium cursor-pointer">Signatures</Label>
                      <Switch id="toggle-signatures" checked={showSignatures} onCheckedChange={setShowSignatures} />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

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
            <SheetTitle>Invoice preview</SheetTitle>
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
