import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from './translate.service';
import { CATEGORIES } from '../data/categories.data';
import { CATEGORY_TEXT_KM, CategoryTextKm, SUBCATEGORY_NAME_KM } from './taxonomy.km';

type CategoryField = keyof CategoryTextKm;
interface CategoryLike {
  slug?: string;
  name?: string;
  shortName?: string;
  description?: string;
  tagline?: string;
  banner?: string;
}

// The API stores category/sub-category as English text, so plain strings are
// matched back to a slug by their English name.
const SLUG_BY_NAME = new Map<string, string>();
for (const category of CATEGORIES) {
  SLUG_BY_NAME.set(category.name, category.slug);
  for (const sub of category.subcategories) SLUG_BY_NAME.set(sub.name, sub.slug);
}

/**
 * Display text for a platform category or sub-category in the current
 * language: `{{ category | categoryText }}`, `{{ category | categoryText: 'tagline' }}`,
 * `{{ product.subcategory | categoryText }}`. Never use the result as a filter value.
 */
@Pipe({ name: 'categoryText', standalone: true, pure: false })
export class CategoryTextPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(item: CategoryLike | string | null | undefined, field: CategoryField = 'name'): string {
    if (item === null || item === undefined) return '';
    const source: CategoryLike = typeof item === 'string' ? { name: item, slug: SLUG_BY_NAME.get(item) } : item;
    const english = source[field] ?? (field === 'shortName' ? source.name : '') ?? '';
    if (this.translate.currentLang() !== 'km' || !source.slug) return english;
    const top = CATEGORY_TEXT_KM[source.slug];
    if (top) return top[field] ?? (field === 'shortName' ? top.name : english);
    if (field === 'name') return SUBCATEGORY_NAME_KM[source.slug] ?? english;
    return english;
  }
}
