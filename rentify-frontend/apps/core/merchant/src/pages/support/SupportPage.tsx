import React, { useMemo, useState } from 'react';
import {
  Search,
  Send,
  Mail,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import SupportCases from './SupportCases';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'cod',
    question: 'How do I take cash on delivery?',
    answer:
      'Cash on delivery orders appear in your Orders inbox under the "Cash to collect" tab once marked as delivered. When your courier or driver delivers the package and collects the cash, open the order and tap "Record cash collected" to mark the order as paid.',
  },
  {
    id: 'returns',
    question: 'How do buyers return an item?',
    answer:
      'Buyers can submit return requests from their marketplace orders page within 48 hours of delivery (DEC-009). When a buyer opens a return case, you will be notified under "Returns & problems" to inspect the report, approve the return, or message support.',
  },
  {
    id: 'marketplace-sync',
    question: 'How do my products appear in the Rentify Marketplace?',
    answer:
      'Products created in your merchant catalog can be listed directly in the central marketplace. Once your store profile and primary category are verified, approved items automatically become discoverable to shoppers across Rentify Market (DEC-028).',
  },
  {
    id: 'pos-sync',
    question: 'How does Point of Sale (POS) inventory synchronization work?',
    answer:
      'The POS interface shares the same unified commerce engine as your online storefront and marketplace. When an in-store transaction is finalized at the register, stock quantities update immediately across all channels to prevent overselling.',
  },
  {
    id: 'payouts',
    question: 'When and how do I receive payouts for sales?',
    answer:
      'Earnings from marketplace transactions and digital storefront payments are processed regularly. Funds are settled directly to your designated bank account or Bakong KHQR merchant wallet according to your payout preferences in Settings › Payments.',
  },
  {
    id: 'staff-roles',
    question: 'Can I add staff members with restricted cashier access?',
    answer:
      'Yes. Go to Settings › Staff to invite team members with specific roles such as Cashier (POS counter only), Store Manager, or Admin. Cashier accounts only see POS and order workflows without sensitive store settings.',
  },
];

export const SupportPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>('cod');

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const toggleFaq = (id: string) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {/* Wireframe M25 Head: Title + Subtitle */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Help</h1>
          <p className="mt-1 text-sm text-muted-foreground hidden sm:block">
            Find answers, follow open support cases, and reach the Rentify team.
          </p>
        </div>

        {/* Search help input - Top of page per Wireframe M25 Note 1 */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help articles and questions…"
            className="w-full bg-card pl-10 pr-4 h-11 rounded-xl border border-input text-sm placeholder:text-muted-foreground shadow-xs focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Contact Rentify - 44px min touch target buttons */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Contact Rentify</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="https://t.me/rentify_support"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-soft transition hover:bg-muted/60"
            >
              <Send className="h-4 w-4 text-sky-500" />
              <span>Telegram</span>
            </a>
            <a
              href="mailto:support@rentify.com"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-soft transition hover:bg-muted/60"
            >
              <Mail className="h-4 w-4 text-primary" />
              <span>Email</span>
            </a>
          </div>
        </section>

        {/* Your support cases - Real cases from Core */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Your support cases</h2>
          <SupportCases />
        </section>

        {/* Common questions - FAQ accordion */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Common questions</h2>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-card-border bg-card shadow-soft">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                return (
                  <div key={faq.id} className="transition-colors">
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="flex w-full min-h-[48px] items-center justify-between p-4 text-left transition hover:bg-muted/40"
                    >
                      <span className="text-sm font-semibold text-foreground pr-4">{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No questions match &ldquo;{searchQuery}&rdquo;. Try another term or contact support above.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SupportPage;
