import { Globe } from "lucide-react";
import { Button } from "@rentify/shared/ui/button";

// Each option is named in its own language so it can be found whichever
// language is showing. `value` accepts the legacy 'kh' code as well as 'km'.
const OPTIONS = [
  { key: "en", label: "English", lang: "en" },
  { key: "km", label: "ភាសាខ្មែរ", lang: "km" },
];

export function LanguageSwitcher({ value, onChange, compact = false, label = "Language" }) {
  const current = value === "kh" ? "km" : value;

  // Phones: one 44px button that switches to the other language.
  if (compact) {
    const next = OPTIONS.find((opt) => opt.key !== current) ?? OPTIONS[0];
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => onChange(next.key)}
        aria-label={label}
        lang={next.lang}
        className="h-11 min-w-11 gap-1.5 rounded-xl px-2.5 text-xs font-semibold"
      >
        <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{next.key === "km" ? "ខ្មែរ" : "EN"}</span>
      </Button>
    );
  }

  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-0.5 rounded-full border bg-card p-0.5">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.key}
          type="button"
          size="sm"
          variant="ghost"
          lang={opt.lang}
          onClick={() => onChange(opt.key)}
          aria-pressed={current === opt.key}
          className={`h-11 rounded-full px-3 text-xs font-medium transition-all duration-200 ${
            current === opt.key
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
