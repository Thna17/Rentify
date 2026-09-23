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
