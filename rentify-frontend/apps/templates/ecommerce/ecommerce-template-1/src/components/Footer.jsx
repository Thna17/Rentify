import React from 'react';
import { 
  MapPin, 
  Phone, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin 
} from 'lucide-react';
import { useStorefrontWebsite as useWebsiteData } from '@rentify/storefront';
import { cn } from '@rentify/storefront';

export default function Footer() {
  const { getFilteredContent } = useWebsiteData();

  const globalSettingContent = getFilteredContent('global setting');
  const Locations = globalSettingContent.find((item) => item.label === 'Locations')?.value || '123 Premium Avenue, Luxury District';
  const PhoneNumber = globalSettingContent.find((item) => item.label === 'Phone Number')?.value || '+855 12 345 678';
  const socialMediaLinks = globalSettingContent.find(item => item.label === 'Social Media')?.value || {};

  const socialIcons = [
    { name: 'facebook', icon: Facebook, label: 'Facebook' },
    { name: 'twitter', icon: Twitter, label: 'Twitter' },
    { name: 'instagram', icon: Instagram, label: 'Instagram' },
    { name: 'linkedin', icon: Linkedin, label: 'LinkedIn' },
  ];

  return (
    <footer className="w-full bg-background border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Contact Info */}
        <div className="flex flex-col items-center text-center mb-8 lg:mb-12 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{Locations}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{PhoneNumber}</span>
          </div>
        </div>

        {/* Accepted Payment Methods Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between py-6 border-t gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Accepted & Supported Payments
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Cash on Delivery (Available)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50/80 text-amber-700 border border-amber-200">
              Bakong KHQR
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-800">Soon</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50/80 text-amber-700 border border-amber-200">
              ABA PayWay
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-800">Soon</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50/80 text-amber-700 border border-amber-200">
              Visa / Mastercard
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-800">Soon</span>
            </span>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Rentify. All Rights Reserved
          </p>

          <div className="flex items-center gap-3">
            {socialIcons.map(({ name, icon: Icon, label }) => {
              const url = socialMediaLinks[name];
              return (
                url?.trim() && (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={cn(
                      "p-2 text-muted-foreground hover:text-foreground",
                      "transition-all duration-200 hover:scale-110",
                      "rounded-lg hover:bg-accent"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                )
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
