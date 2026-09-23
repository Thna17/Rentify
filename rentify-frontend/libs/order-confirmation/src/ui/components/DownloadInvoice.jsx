import { InvoicePDF } from '@rentify/shared/ui/components/InvoicePDF';
import { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@rentify/shared/ui/button';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext';
import { Download } from 'lucide-react';

export const DownloadInvoiceButton = ({
  invoiceData,
  companyInfo,
  websiteName,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  return (
    <PDFDownloadLink
      document={
        <InvoicePDF
          invoiceData={invoiceData}
          websiteName={websiteName}
          companyInfo={companyInfo}
          showSignatures={true}
          showWatermark={true}
          pageNumber={1}
          totalPages={1}
        />
      }
      fileName={`invoice_${invoiceData.invoiceNumber}.pdf`}
      onClick={() => setLoading(true)}
    >
      {({ loading: pdfLoading }) => (
        <Button
          variant="outline"
          size="lg"
          className="w-full gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          disabled={loading || pdfLoading}
        >
          {loading || pdfLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              {t('confirmation.generating_invoice')}
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              {t('confirmation.download_invoice')}
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
};
