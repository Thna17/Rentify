import { 
  Share2,
  Mail,
  Copy,
  FileDown,
  Facebook,
  Twitter,
  Linkedin,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Separator } from '@rentify/shared/ui/separator';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@rentify/shared/ui/Popover';
import { useState } from 'react';
import { pdf, PDFDownloadLink } from '@react-pdf/renderer';

import { InvoicePDF } from '@rentify/shared/ui/components/InvoicePDF';
export const ShareButton = ({ invoiceData, websiteName, companyInfo }) => {
  const [isOpen, setIsOpen] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `Invoice ${invoiceData.invoiceNumber} for ${invoiceData.customerName || 'Customer'} - Total: ${invoiceData.total}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEmailShare = () => {
    const subject = `Invoice ${invoiceData.invoiceNumber}`;
    const body = `${shareText}\n\nView invoice: ${shareUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    setIsOpen(false);
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoiceData.invoiceNumber}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    }
    setIsOpen(false);
  };

  const socialIcons = [
    { platform: 'facebook', icon: <Facebook className="w-5 h-5 text-blue-600" />, label: 'Facebook' },
    { platform: 'twitter', icon: <Twitter className="w-5 h-5 text-blue-400" />, label: 'Twitter' },
    { platform: 'linkedin', icon: <Linkedin className="w-5 h-5 text-blue-700" />, label: 'LinkedIn' },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <div className="grid">
          <button 
            className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={handleWebShare}
          >
            <Share2 className="w-4 h-4 mr-3" />
            <span>Share via...</span>
          </button>
          <button 
            className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={handleEmailShare}
          >
            <Mail className="w-4 h-4 mr-3" />
            <span>Email Invoice</span>
          </button>
          <button 
            className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={handleCopyLink}
          >
            <Copy className="w-4 h-4 mr-3" />
            <span>Copy Link</span>
          </button>
        </div>
        <Separator />
        <div className="p-3">
          <h4 className="text-sm font-medium mb-2">Share on social</h4>
          <div className="flex justify-center gap-4">
            {socialIcons.map((social) => (
              <button
                key={social.platform}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {social.icon}
              </button>
            ))}
          </div>
        </div>
        <Separator />
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
          fileName={`invoice-${invoiceData.invoiceNumber}.pdf`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          {({ loading }) => (
            <button 
              className={`flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 w-full ${loading ? 'opacity-70' : ''}`}
              disabled={loading}
            >
              <FileDown className="w-4 h-4 mr-3" />
              <span>
                {loading ? 'Generating PDF...' : 'Download PDF'}
              </span>
            </button>
          )}
        </PDFDownloadLink>
      </PopoverContent>
    </Popover>
  );
};
