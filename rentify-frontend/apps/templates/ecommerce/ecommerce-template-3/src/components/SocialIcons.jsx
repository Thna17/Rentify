import { Facebook, Instagram, Linkedin, Music2, Send, Twitter, Youtube } from 'lucide-react';

const NETWORKS = {
  facebook: { label: 'Facebook', Icon: Facebook },
  instagram: { label: 'Instagram', Icon: Instagram },
  tiktok: { label: 'TikTok', Icon: Music2 },
  telegram: { label: 'Telegram', Icon: Send },
  youtube: { label: 'YouTube', Icon: Youtube },
  twitter: { label: 'X', Icon: Twitter },
  linkedin: { label: 'LinkedIn', Icon: Linkedin },
};

/** The merchant's social profiles (already URL-sanitized in the store identity). */
export function SocialIcons({ links, label, className = '', itemClassName = '' }) {
  if (!links?.length) return null;
  return (
    <ul aria-label={label} className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {links.map(({ network, url }) => {
        const { label: name, Icon } = NETWORKS[network];
        return (
          <li key={network}>
            <a href={url} target="_blank" rel="noopener noreferrer" aria-label={name} title={name} className={itemClassName}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
