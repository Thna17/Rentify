import React, { useState } from 'react';
import {
  Headphones,
  Mail,
  Send,
  ExternalLink,
  BookOpen,
  MessageSquare,
  HelpCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Store,
  CreditCard,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Textarea } from '@rentify/shared/ui/textarea';
import { Label } from '@rentify/shared/ui/label';
import { Badge } from '@rentify/shared/ui/badge';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';
import { toast } from 'sonner';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'marketplace-sync',
    category: 'Marketplace',
    question: 'How do my products appear in the Rentify Marketplace?',
    answer:
      'Products created in your merchant catalog can be listed directly in the central marketplace. Once your store profile and primary category are verified, your approved items automatically become discoverable to shoppers across the marketplace.',
  },
  {
    id: 'pos-integration',
    category: 'POS',
    question: 'How does Point of Sale (POS) inventory synchronization work?',
    answer:
      'The POS interface shares the same unified commerce engine as your online storefront and marketplace. When an in-store transaction is finalized at the register, stock quantities update immediately across all channels to prevent overselling.',
  },
  {
    id: 'payouts-schedule',
    category: 'Payments',
    question: 'When and how do I receive payouts for sales?',
    answer:
      'Earnings from marketplace transactions and digital storefront payments are processed regularly. Funds are settled directly to your designated bank account or Bakong KHQR merchant wallet according to your payout preferences in Store Settings.',
  },
  {
    id: 'staff-roles',
    category: 'Staff & Security',
    question: 'Can I add staff members with restricted cashier access?',
    answer:
      'Yes. Go to Store Settings > Staff & Roles to invite team members with specific roles such as Cashier (POS only), Store Manager, or Admin. Each role can be configured with granular permissions.',
  },
  {
    id: 'storefront-domain',
    category: 'Storefront',
    question: 'Can I customize my storefront website or add a custom domain?',
    answer:
      'Storefront websites can be customized via Sales Channels > Storefront Website. You can change themes, configure banners, and connect a custom top-level domain.',
  },
];

export const SupportPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<string | null>('marketplace-sync');
  const [category, setCategory] = useState('Marketplace');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleFaq = (id: string) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in both the subject and message');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubject('');
      setMessage('');
      toast.success('Support request sent! Our merchant team will reply shortly.');
    }, 600);
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Merchant Support & Help Center"
        description="Get assistance with store operations, marketplace selling, POS, and payments."
        icon={Headphones}
        breadcrumb={[
          { label: 'Dashboard', href: '/overview' },
          { label: 'Support' },
        ]}
      />

      <div className="p-6 md:p-8 space-y-8">
        {/* Support Channel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Email Support */}
          <Card className="border-border hover:border-emerald-500/30 transition-all hover:shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Mail className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[11px] font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  24/7 Desk
                </Badge>
              </div>
              <CardTitle className="text-base">Email Support</CardTitle>
              <CardDescription className="text-xs">
                Direct merchant ticket response
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm font-semibold text-foreground">
                support@rentify.com
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Typical response in &lt; 2 hours
              </div>
              <a
                href="mailto:support@rentify.com"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-medium transition-colors"
              >
                Send Email
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </CardContent>
          </Card>

          {/* Telegram Channel */}
          <Card className="border-border hover:border-sky-500/30 transition-all hover:shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Send className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[11px] font-medium border-sky-500/30 text-sky-600 dark:text-sky-400">
                  Community
                </Badge>
              </div>
              <CardTitle className="text-base">Telegram Community</CardTitle>
              <CardDescription className="text-xs">
                Live chat with team and merchants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm font-semibold text-foreground">
                @rentify_support
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                Instant announcements &amp; updates
              </div>
              <a
                href="https://t.me/rentify_support"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 text-xs font-medium transition-colors"
              >
                Join Telegram
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </CardContent>
          </Card>

          {/* Documentation */}
          <Card className="border-border hover:border-purple-500/30 transition-all hover:shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[11px] font-medium border-purple-500/30 text-purple-600 dark:text-purple-400">
                  Guides
                </Badge>
              </div>
              <CardTitle className="text-base">Merchant Knowledge Base</CardTitle>
              <CardDescription className="text-xs">
                Step-by-step guides &amp; documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm font-semibold text-foreground">
                Platform Documentation
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Setup tutorials, POS, &amp; APIs
              </div>
              <Button
                variant="outline"
                className="w-full text-xs font-medium gap-2 border-border hover:bg-muted/60"
                onClick={() => toast.info('Documentation portal opens in new tab')}
              >
                Browse Documentation
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Two-Column Layout: Contact Form & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Submit a Ticket Form */}
          <div className="lg:col-span-7">
            <Card className="border-border shadow-xs">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Send a Message</CardTitle>
                    <CardDescription className="text-xs">
                      Submit a support ticket directly to our merchant assistance team.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div>
                    <Label htmlFor="category" className="text-xs font-medium">
                      Topic / Category
                    </Label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="Marketplace">Marketplace Selling &amp; Approval</option>
                      <option value="Products">Products &amp; Catalog Management</option>
                      <option value="POS">Point of Sale (POS) &amp; Register</option>
                      <option value="Orders">Orders &amp; Invoices</option>
                      <option value="Payments">Payments &amp; Settlement</option>
                      <option value="Account">Account, Staff, &amp; Permissions</option>
                      <option value="Other">Other / Technical Question</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="subject" className="text-xs font-medium">
                      Subject
                    </Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary of your question or issue"
                      className="mt-1.5"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-xs font-medium">
                      Message Details
                    </Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe what you need help with in detail..."
                      rows={5}
                      className="mt-1.5"
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5"
                    >
                      {isSubmitting ? 'Sending...' : 'Submit Request'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* System Status & Operational Overview */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-border shadow-xs">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    System Status
                  </CardTitle>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs">
                    All Systems Operational
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Live status of platform services and channels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-xs">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                    Marketplace Service
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Operational
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-xs">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-muted-foreground" />
                    Storefront Platform
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Operational
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-xs">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    Payment Gateway (KHQR)
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Operational
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/20">
              <CardContent className="p-4 space-y-2">
                <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Need Dedicated Onboarding?
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Our merchant success specialists can guide you through catalog import, POS terminal setup, and marketplace verification.
                </p>
                <div className="pt-1">
                  <a
                    href="mailto:support@rentify.com?subject=Merchant%20Onboarding%20Assistance"
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Request an onboarding call &rarr;
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-foreground">Frequently Asked Questions</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {FAQ_ITEMS.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-xl border border-border bg-card p-4 transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[11px] font-medium border-border text-muted-foreground">
                        {faq.category}
                      </Badge>
                      <span className="text-sm font-semibold text-foreground">
                        {faq.question}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    )}
                  </button>

                  {isOpen && (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground pl-1 border-t border-border/50 pt-3">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
