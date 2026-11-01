import { useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useMemo } from 'react';
import { useAuth, useTranslation } from '@rentify/utils';
import { toast } from 'sonner';
import {
  Download,
  Eye,
  Save,
  Loader2,
  Settings,
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
  Receipt,
} from 'lucide-react';

// Shadcn components
import { Button } from '@rentify/shared/ui/button';
import { Label } from '@rentify/shared/ui/label';
import { Badge } from '@rentify/shared/ui/badge';
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
import { PageShell, PageTitle, StatePanel, TabBar } from '../../components/page/PagePrimitives';
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

const WORK_TABS = ['all', 'unpaid', 'paid', 'drafts'];

export const InvoiceManual = () => {
  const { t } = useTranslation();
  // /invoices?new=1 ("New order" on the Orders page) opens the form directly
  // The address decides the view (/invoices?new=1 is the form), so the back link and Back both return to the list
  const { search } = useLocation();
  const navigate = useNavigate();
  const viewMode = new URLSearchParams(search).get('new') ? 'new' : 'list';
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


  // The seller block on the invoice: only the Store's real details (no address is stored yet)
  const { store } = useChannels();
  const { profile } = useAuth();
  const websiteName = store?.name || '';
  const companyInfo = {
    name: store?.name || '',
    address: '',
    phone: profile?.phoneNumber || profile?.phone || '',
    email: profile?.email || '',
    website: store?.slug ? `${store.slug}.mekhla.digital` : '',
    watermark: store?.name || '',
    logo: store?.logoUrl || '',
  };

  const openNewInvoice = () => {
    setIsSaved(false);
    navigate('/invoices?new=1');
  };

  const handleSaveInvoice = async () => {
    setIsSaving(true);
    try {
      if (!invoiceData.customerName || invoiceData.items.length === 0) {
        throw Object.assign(
          new Error(
            invoiceData.customerName
              ? t('dashboard.invoices.error_no_items')
              : t('dashboard.invoices.error_customer_name')
          ),
          { isFormCheck: true }
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
      toast.success(t('dashboard.invoices.success_message'));

      updateField('id', response.invoice.id);
      updateField('invoiceNumber', response.invoice.invoiceNumber);
      updateField('pdfUrl', response.invoice.pdfUrl);
      updateField('status', response.invoice.status);
      updateField('paymentData', response.paymentData);
      refetchInvoices();
    } catch (error) {
      console.error('Failed to save invoice:', error);
      // Our own checks say what to fix; anything else gets one plain message
      toast.error(error?.isFormCheck ? error.message : t('dashboard.invoices.error_save_failed'));
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
      <PageShell width="medium">
        <PageTitle
          title={t('merchant.invoices.title')}
          description={t('merchant.invoices.listBody')}
          actions={
            <Button onClick={openNewInvoice} className="min-h-[44px] rounded-xl px-5">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('merchant.invoices.newTitle')}
            </Button>
          }
        />

        {/* Work tabs and search (Screen M14) */}
        <TabBar
          items={WORK_TABS.map((id) => ({ id, label: t(`merchant.invoices.tabs.${id}`) }))}
          value={activeTab}
          onChange={setActiveTab}
          label={t('merchant.invoices.title')}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            aria-label={t('merchant.invoices.search')}
            placeholder={t('merchant.invoices.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-xl pl-9"
          />
        </div>

        {isLoadingInvoices ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32 rounded-lg" />
                  <Skeleton className="h-4 w-48 rounded-lg" />
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="ml-auto h-5 w-16 rounded-lg" />
                  <Skeleton className="ml-auto h-4 w-12 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : isErrorInvoices ? (
          <StatePanel
            tone="error"
            icon={<AlertCircle className="h-5 w-5" />}
            title={t('merchant.invoices.loadError')}
            action={
              <Button variant="outline" onClick={() => refetchInvoices()} className="min-h-[44px] rounded-xl">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t('merchant.p.tryAgain')}
              </Button>
            }
          />
        ) : filteredInvoices.length === 0 ? (
          rawInvoices.length === 0 ? (
            <StatePanel
              icon={<Receipt className="h-5 w-5" />}
              title={t('merchant.invoices.emptyTitle')}
              body={t('merchant.invoices.emptyBody')}
              action={
                <Button onClick={openNewInvoice} className="min-h-[44px] rounded-xl px-5">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('merchant.invoices.newTitle')}
                </Button>
              }
            />
          ) : (
            <StatePanel icon={<Search className="h-5 w-5" />} title={t('merchant.invoices.noMatch')} />
          )
        ) : (
          <ul className="space-y-2.5">
            {filteredInvoices.map((inv) => {
              const invNumber = inv.invoiceNumber || `INV-${inv.id}`;
              const customer = inv.customer?.name || inv.customerName || t('merchant.invoices.customer');
              const totalAmount = inv.total || inv.pricing?.total || 0;
              const status = String(inv.status || 'unpaid').toLowerCase();
              const isPaid = status === 'paid';
              const isDraft = status === 'draft';
              // Only dates the invoice really has
              const when = isPaid
                ? t('merchant.invoices.tabs.paid')
                : inv.dueDate
                ? t('merchant.invoices.due', { date: inv.dueDate })
                : null;

              return (
                <li
                  key={inv.id || invNumber}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-sm font-semibold text-foreground">{invNumber}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {customer}
                      {when ? ` · ${when}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <p className="font-mono text-sm font-semibold text-foreground sm:text-base">
                      ${Number(totalAmount).toFixed(2)}
                    </p>
                    {isPaid ? (
                      <Badge className="border-[var(--rentify-color-success-border)] bg-[var(--rentify-color-success-subtle)] text-[var(--rentify-color-success-text)]">
                        {t('merchant.invoices.tabs.paid')}
                      </Badge>
                    ) : isDraft ? (
                      <Badge variant="secondary">{t('merchant.invoices.draft')}</Badge>
                    ) : (
                      <Badge className="border-[var(--rentify-color-warning-border)] bg-[var(--rentify-color-warning-subtle)] text-[var(--rentify-color-warning-text)]">
                        {t('merchant.invoices.tabs.unpaid')}
                      </Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PageShell>
    );
  }

  // Render M15: New Invoice Form View
  return (
    <PageShell>
      <PageTitle
        back={{ to: '/invoices', label: t('merchant.invoices.title') }}
        title={t('merchant.invoices.newTitle')}
        description={t('merchant.invoices.newBody')}
        actions={
          <>
            <Button variant="outline" onClick={() => setMobilePreviewOpen(true)} className="min-h-[44px] rounded-xl lg:hidden">
              <Eye className="h-4 w-4" aria-hidden="true" />
              {t('merchant.invoices.preview')}
            </Button>
            {!isSaved ? (
              <Button
                onClick={handleSaveInvoice}
                disabled={isSaving}
                className="min-h-[44px] rounded-xl px-5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>{t('merchant.common.saving')}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" aria-hidden="true" />
                    <span>{t('merchant.invoices.saveSend')}</span>
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
                      className="min-h-[44px] rounded-xl px-4"
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                      <span>{t('merchant.invoices.downloadPdf')}</span>
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

          </>
        }
      />

      <div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Section */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6 [&_input]:min-h-11 sm:[&_input]:min-h-0 [&_[role=combobox]]:min-h-11 sm:[&_[role=combobox]]:min-h-0">
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
              <h2 className="text-base font-semibold text-foreground">{t('merchant.invoices.preview')}</h2>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-h-[44px] rounded-xl">
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    <span>{t('dashboard.invoices.options')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-4 space-y-3">
                  <h3 className="border-b border-border pb-2 text-sm font-semibold">{t('dashboard.invoices.preview_options')}</h3>
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-watermark" className="cursor-pointer text-sm font-medium">{t('dashboard.invoices.show_watermark')}</Label>
                      <Switch id="toggle-watermark" checked={showWatermark} onCheckedChange={setShowWatermark} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="toggle-signatures" className="cursor-pointer text-sm font-medium">{t('dashboard.invoices.show_signatures')}</Label>
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
            <SheetTitle>{t('merchant.invoices.preview')}</SheetTitle>
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
    </PageShell>
  );
};

export default InvoiceManual;
