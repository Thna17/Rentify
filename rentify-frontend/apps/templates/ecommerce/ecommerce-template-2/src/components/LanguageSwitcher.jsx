import { Button } from "@rentify/shared/ui/button";

export function LanguageSwitcher({ value, onChange }) {
  const options = [
    { key: "en", label: "ENG" },
    { key: "kh", label: "ខ្មែរ" },
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-full border bg-card p-1">
      {options.map((opt) => (
        <Button
          key={opt.key}
          size="sm"
          variant="ghost"
          onClick={() => onChange(opt.key)}
          aria-pressed={value === opt.key}
          className={`h-7 rounded-full px-3 text-xs font-medium transition-all duration-200 ${
            value === opt.key
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