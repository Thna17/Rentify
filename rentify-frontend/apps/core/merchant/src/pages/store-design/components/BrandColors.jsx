import { useState } from 'react';
import { useUpdateThemeConfigurationMutation } from '@rentify/apis/apis/websiteApi';
import { EDITORIAL_STYLES } from '@rentify/storefront/editorialStyles';
import { Button } from '@rentify/shared/ui/button';

const HEX = /^#[0-9a-f]{6}$/i;
const labels = {
  primary: 'Accent',
  secondary: 'Supporting color',
  background: 'Background',
};
export const readBrandTheme = (value) => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};
export const mergeBrandColors = (theme, palette) => {
  const existing = readBrandTheme(theme);
  return { ...existing, colors: { ...existing.colors, ...palette } };
};

/** Saves only the three chosen brand colors through the existing theme API. */
export function BrandColors({
  websiteId,
  savedTheme,
  initialPalette,
  onSaved,
  t,
}) {
  const normalizedTheme = readBrandTheme(savedTheme);
  const [palette, setPalette] = useState(() =>
    Object.fromEntries(
      Object.keys(labels).map((key) => [
        key,
        HEX.test(normalizedTheme.colors?.[key])
          ? normalizedTheme.colors[key]
          : HEX.test(initialPalette?.[key])
          ? initialPalette[key]
          : EDITORIAL_STYLES[5].palette[key],
      ])
    )
  );
  const [save, { isLoading }] = useUpdateThemeConfigurationMutation();
  const [message, setMessage] = useState('');
  const submit = async () => {
    setMessage('');
    try {
      await save({
        websiteId,
        theme: mergeBrandColors(savedTheme, palette),
      }).unwrap();
      setMessage(t('merchant.storeDesign.colors.saved'));
      onSaved?.();
    } catch {
      setMessage(t('merchant.storeDesign.colors.error'));
    }
  };
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t('merchant.storeDesign.colors.description')}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {Object.values(EDITORIAL_STYLES).map((style) => (
          <button
            key={style.key}
            type="button"
            disabled={isLoading}
            aria-pressed={Object.keys(labels).every(
              (key) => palette[key] === style.palette[key]
            )}
            onClick={() => {
              setPalette(style.palette);
              setMessage('');
            }}
            className="rounded-xl border border-border p-3 text-left aria-pressed:border-primary aria-pressed:ring-1 aria-pressed:ring-primary"
          >
            <span
              className="flex h-8 overflow-hidden rounded-md border border-border"
              aria-hidden="true"
            >
              {Object.values(style.palette).map((color, index) => (
                <span
                  key={index}
                  className="flex-1"
                  style={{ background: color }}
                />
              ))}
            </span>
            <span className="mt-2 block text-xs font-medium">{style.name}</span>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {Object.keys(labels).map((key) => (
          <label
            key={key}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span>{t(`merchant.storeDesign.colors.${key}`)}</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {palette[key]}
              </span>
              <input
                aria-label={t(`merchant.storeDesign.colors.${key}`)}
                type="color"
                value={palette[key]}
                disabled={isLoading}
                onChange={(event) => {
                  setPalette({ ...palette, [key]: event.target.value });
                  setMessage('');
                }}
                className="h-11 w-12 cursor-pointer rounded border border-border bg-card p-1"
              />
            </span>
          </label>
        ))}
      </div>
      <Button className="h-11 w-full" disabled={isLoading} onClick={submit}>
        {t(
          isLoading
            ? 'merchant.storeDesign.colors.saving'
            : 'merchant.storeDesign.colors.save'
        )}
      </Button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
