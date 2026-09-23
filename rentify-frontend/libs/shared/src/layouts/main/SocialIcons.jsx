import { Instagram, Twitter, Youtube } from "lucide-react";

export function SocialIcons() {
  const items = [
    { href: "https://instagram.com", label: "Instagram", Icon: Instagram },
    { href: "https://twitter.com", label: "Twitter", Icon: Twitter },
    { href: "https://youtube.com", label: "YouTube", Icon: Youtube },
  ];
  return (
    <nav aria-label="Social links" className="flex gap-2">
      {items.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          aria-label={label}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-primary hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon className="size-4" />
        </a>
      ))}
    </nav>
  );
}