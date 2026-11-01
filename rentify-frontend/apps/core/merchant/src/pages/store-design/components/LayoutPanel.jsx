import { ArrowDown, ArrowUp, Lock, RotateCcw } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Switch } from '@rentify/shared/ui/switch';

/** Show, hide and reorder the previewed template's home-page sections. */
export function LayoutPanel({ templateLabel, layout, onMove, onToggle, onReset, isDefault, t }) {
  const sectionName = (id) => t(`merchant.storeDesign.sections.${id}`);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-foreground">{t('merchant.storeDesign.layoutFor', { name: templateLabel })}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('merchant.storeDesign.layoutIntro')}</p>
      </div>

      <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        <li className="flex min-h-14 items-center gap-3 px-4 py-2 text-sm">
          <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 font-medium text-foreground">{sectionName('hero')}</span>
          <span className="text-xs text-muted-foreground">{t('merchant.storeDesign.alwaysFirst')}</span>
        </li>
        {layout.map((item, index) => {
          const name = sectionName(item.id);
          return (
            <li key={item.id} className="flex min-h-14 items-center gap-1 py-1 pl-4 pr-2 text-sm">
              <span className={`flex-1 ${item.hidden ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}`}>
                {name}
                {item.hidden && <span className="sr-only">, {t('merchant.storeDesign.hidden')}</span>}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                aria-label={t('merchant.storeDesign.moveUp', { name })}
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                aria-label={t('merchant.storeDesign.moveDown', { name })}
                disabled={index === layout.length - 1}
                onClick={() => onMove(index, 1)}
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Button>
              <label className="flex h-11 w-14 cursor-pointer items-center justify-center">
                <Switch
                  checked={!item.hidden}
                  onCheckedChange={() => onToggle(item.id)}
                  aria-label={t('merchant.storeDesign.showSection', { name })}
                />
              </label>
            </li>
          );
        })}
      </ol>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11" onClick={onReset} disabled={isDefault}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t('merchant.storeDesign.reset')}
          </Button>
          <Button className="h-11 flex-1" disabled>
            {t('merchant.storeDesign.saveLayout')}
          </Button>
        </div>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('merchant.storeDesign.layoutBlocked')}
        </p>
      </div>
    </div>
  );
}
