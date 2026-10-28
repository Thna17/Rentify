// admin-frontend/src/app/core/i18n/translate.pipe.ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from './translate.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly translate: TranslateService;

  constructor(translate?: TranslateService) {
    this.translate = translate || inject(TranslateService);
  }

  transform(key: string, params?: Record<string, string | number>): string {
    if (!key) return '';
    return this.translate.t(key, params);
  }
}
