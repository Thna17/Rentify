import React from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Palette,
  ExternalLink,
  Share2,
  ChevronRight,
  Store,
  Layers,
  FileText,
  Building2,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';
import { useGetWebsiteQuery } from '@rentify/apis';
import { useTranslation } from '@rentify/utils';

export const OnlineStorePage: React.FC = () => {
  const { t } = useTranslation();
  const { data: websiteData, isLoading, isError, refetch } = useGetWebsiteQuery();

  if (isLoading) {
    return (
      <div className="min-h-full">
        <PageHeader
          title="Online store"
          description="Your public storefront on the web"
          icon={Store}
          breadcrumb={[
            { label: 'Dashboard', href: '/overview' },
            { label: 'Online store' },
          ]}
        />
        <div className="flex flex-col justify-center items-center h-80 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading store details...</p>
        </div>
      </div>
    );
  }

  if (isError || !websiteData) {
    return (
      <div className="min-h-full">
        <PageHeader
          title="Online store"
          description="Your public storefront on the web"
          icon={Store}
          breadcrumb={[
            { label: 'Dashboard', href: '/overview' },
            { label: 'Online store' },
          ]}
        />
        <div className="p-6 max-w-xl mx-auto mt-10">
          <Card className="border border-[var(--rentify-color-border-subtle,#ece8e1)] p-6 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold text-foreground text-base">Storefront unavailable</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Unable to load your online storefront details.
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()} className="min-h-[44px]">
              Try again
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const isLive = websiteData.status === 'active' || Boolean(websiteData.storefrontUrl);
  const rawDomain =
    websiteData.storefrontUrl ||
    websiteData.domain ||
    (websiteData.subdomain ? `${websiteData.subdomain}.rentifystore.shop` : 'localhost:4650');
  const storeUrl = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`;
  const displayDomain = rawDomain.replace(/^https?:\/\//, '');

  const storeSections = [
    {
      title: 'Look',
      description: 'Template, colours and page layout',
      icon: Palette,
      href: '/customization',
    },
    {
      title: 'Content',
      description: 'Banner, highlights, about us',
      icon: FileText,
      href: '/customization',
    },
    {
      title: 'Store details',
      description: 'Name, logo, contact',
      icon: Building2,
      href: '/settings/account',
    },
    {
      title: 'Web address',
      description: 'Your own domain (opens on rentifystore.shop for checkout)',
      icon: Globe,
      href: '#domain',
      isDomain: true,
    },
  ];

  return (
    <div className="min-h-full">
      <PageHeader
        title="Online store"
        description="Your public storefront on the web"
        icon={Store}
        breadcrumb={[
          { label: 'Dashboard', href: '/overview' },
          { label: 'Online store' },
        ]}
      />

      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl">
        {/* Top Card: Live Store Status & Quick Launch (Screen M17) */}
        <Card className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {isLive ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30 font-medium px-2.5 py-0.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-2.5 py-0.5 text-xs text-muted-foreground">
                    Draft
                  </Badge>
                )}
                <span className="font-semibold text-foreground text-sm sm:text-base font-mono">
                  {displayDomain}
                </span>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button asChild className="min-h-[44px] px-5 bg-primary text-primary-foreground font-medium shadow-sm">
                <Link to="/customization">
                  <Palette className="h-4 w-4 mr-2" />
                  Edit design
                </Link>
              </Button>

              <Button asChild variant="outline" className="min-h-[44px] px-4 font-medium">
                <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit
                </a>
              </Button>

              <Button asChild variant="outline" className="min-h-[44px] px-4 font-medium">
                <Link to="/share">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section: Your store list (Screen M17) */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground px-1">Your store</h3>

          <Card className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)] divide-y divide-[var(--rentify-color-border-subtle,#ece8e1)] overflow-hidden">
            {storeSections.map((sec) => (
              <div key={sec.title}>
                {sec.isDomain ? (
                  <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground shrink-0 mt-0.5">
                        <sec.icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-semibold text-foreground">{sec.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {sec.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
                      Included
                    </Badge>
                  </div>
                ) : (
                  <Link
                    to={sec.href}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5">
                        <sec.icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {sec.title}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {sec.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </Link>
                )}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OnlineStorePage;
