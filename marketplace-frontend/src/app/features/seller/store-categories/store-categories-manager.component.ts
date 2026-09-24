import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { SellerService, StoreCategoryDTO } from '../../../core/api/seller.service';

/**
 * The seller's own category tree — separate from the fixed, marketplace-wide
 * categories every product already has. Lets a seller organize their own
 * storefront (e.g. "Food > Rice, Snacks, Drinks") without touching where a
 * product is discovered marketplace-wide.
 */
@Component({
  selector: 'app-store-categories-manager',
  standalone: true,
  imports: [FormsModule, KcIcon],
  template: `
    <div class="manager">
      <header class="manager-head">
        <div>
          <h2>Store Categories</h2>
          <p class="muted">
            Organize your own storefront into categories and subcategories.
            This is separate from the marketplace category your products
            already have.
          </p>
        </div>
      </header>

      <form class="add-row" (ngSubmit)="createCategory()">
        <input
          class="dash-input"
          placeholder="New category name, e.g. Rice &amp; Grains"
          [(ngModel)]="newCategoryName"
          name="newCategoryName"
          maxlength="80"
        />
        <button class="btn btn-primary" type="submit" [disabled]="!newCategoryName().trim() || saving()">
          <kc-icon name="plus" [size]="16" /> Add category
        </button>
      </form>

      @if (error()) {
        <p class="error-text">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted">Loading categories…</p>
      } @else if (!categories().length) {
        <p class="muted">No store categories yet. Add your first one above.</p>
      } @else {
        <ul class="category-list">
          @for (category of categories(); track category.id; let i = $index) {
            <li class="category-row" [class.hidden-item]="!category.visible">
              <div class="row-main">
                <button type="button" class="icon-btn" title="Move up" [disabled]="i === 0" (click)="moveCategory(i, -1)">
                  <kc-icon name="chevron-up" [size]="16" />
                </button>
                <button type="button" class="icon-btn" title="Move down" [disabled]="i === categories().length - 1" (click)="moveCategory(i, 1)">
                  <kc-icon name="chevron-down" [size]="16" />
                </button>

                @if (editingCategoryId() === category.id) {
                  <input
                    class="dash-input inline-input"
                    [(ngModel)]="editingCategoryName"
                    name="editCategoryName-{{ category.id }}"
                    (keyup.enter)="saveCategoryName(category)"
                  />
                  <button type="button" class="icon-btn" title="Save" (click)="saveCategoryName(category)">
                    <kc-icon name="check" [size]="16" />
                  </button>
                } @else {
                  <button type="button" class="expand-toggle" (click)="toggleExpanded(category.id)">
                    <kc-icon [name]="expandedCategoryId() === category.id ? 'chevron-down' : 'chevron-right'" [size]="14" />
                    <strong>{{ category.name }}</strong>
                  </button>
                  <span class="sub-count">{{ category.subcategories.length }} subcategor{{ category.subcategories.length === 1 ? 'y' : 'ies' }}</span>
                }

                <div class="row-actions">
                  <button type="button" class="icon-btn" title="Rename" (click)="startEditCategory(category)">
                    <kc-icon name="edit" [size]="16" />
                  </button>
                  <button type="button" class="icon-btn" [title]="category.visible ? 'Hide' : 'Show'" (click)="toggleCategoryVisible(category)">
                    <kc-icon [name]="category.visible ? 'eye' : 'eye-off'" [size]="16" />
                  </button>
                  <button type="button" class="icon-btn danger" title="Delete" (click)="deleteCategory(category)">
                    <kc-icon name="trash" [size]="16" />
                  </button>
                </div>
              </div>

              @if (expandedCategoryId() === category.id) {
                <div class="subcategory-panel">
                  @if (!category.subcategories.length) {
                    <p class="muted small">No subcategories yet.</p>
                  }
                  <ul class="subcategory-list">
                    @for (sub of category.subcategories; track sub.id; let si = $index) {
                      <li class="subcategory-row" [class.hidden-item]="!sub.visible">
                        <button type="button" class="icon-btn" title="Move up" [disabled]="si === 0" (click)="moveSubcategory(category, si, -1)">
                          <kc-icon name="chevron-up" [size]="14" />
                        </button>
                        <button type="button" class="icon-btn" title="Move down" [disabled]="si === category.subcategories.length - 1" (click)="moveSubcategory(category, si, 1)">
                          <kc-icon name="chevron-down" [size]="14" />
                        </button>

                        @if (editingSubcategoryId() === sub.id) {
                          <input
                            class="dash-input inline-input"
                            [(ngModel)]="editingSubcategoryName"
                            name="editSubName-{{ sub.id }}"
                            (keyup.enter)="saveSubcategoryName(category, sub)"
                          />
                          <button type="button" class="icon-btn" title="Save" (click)="saveSubcategoryName(category, sub)">
                            <kc-icon name="check" [size]="14" />
                          </button>
                        } @else {
                          <span class="sub-name">{{ sub.name }}</span>
                        }

                        <div class="row-actions">
                          <button type="button" class="icon-btn" title="Rename" (click)="startEditSubcategory(sub)">
                            <kc-icon name="edit" [size]="14" />
                          </button>
                          <button type="button" class="icon-btn" [title]="sub.visible ? 'Hide' : 'Show'" (click)="toggleSubcategoryVisible(category, sub)">
                            <kc-icon [name]="sub.visible ? 'eye' : 'eye-off'" [size]="14" />
                          </button>
                          <button type="button" class="icon-btn danger" title="Delete" (click)="deleteSubcategory(category, sub)">
                            <kc-icon name="trash" [size]="14" />
                          </button>
                        </div>
                      </li>
                    }
                  </ul>

                  <form class="add-row small" (ngSubmit)="createSubcategory(category)">
                    <input
                      class="dash-input"
                      placeholder="New subcategory, e.g. Snacks"
                      [(ngModel)]="newSubcategoryName"
                      name="newSubcategoryName"
                      maxlength="80"
                    />
                    <button class="btn btn-ghost" type="submit" [disabled]="!newSubcategoryName().trim() || saving()">
                      <kc-icon name="plus" [size]="14" /> Add
                    </button>
                  </form>
                </div>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      .manager { display: flex; flex-direction: column; gap: 16px; }
      .manager-head h2 { margin: 0 0 4px; font-size: 20px; }
      .muted { color: #7a8580; font-size: 13px; margin: 0; }
      .muted.small { font-size: 12px; padding: 8px 0; }
      .error-text { color: #b3261e; font-size: 13px; }

      .add-row { display: flex; gap: 8px; }
      .add-row.small { margin-top: 10px; }
      .add-row input { flex: 1; }

      .category-list, .subcategory-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

      .category-row { border: 1px solid #e4ded3; border-radius: 10px; padding: 10px 12px; background: #fff; }
      .category-row.hidden-item, .subcategory-row.hidden-item { opacity: 0.55; }

      .row-main { display: flex; align-items: center; gap: 6px; }
      .row-actions { display: flex; gap: 4px; margin-left: auto; }

      .expand-toggle { display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; font-size: 14px; padding: 4px 2px; }
      .sub-count { font-size: 11.5px; color: #7a8580; }

      .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border: none; background: transparent; border-radius: 6px; cursor: pointer; color: #3a3f3d; }
      .icon-btn:hover { background: #f1ede4; }
      .icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      .icon-btn.danger:hover { background: #fbe8e6; color: #b3261e; }

      .inline-input { max-width: 220px; padding: 4px 8px; height: 30px; }

      .subcategory-panel { margin-top: 10px; padding: 10px 10px 10px 34px; border-top: 1px dashed #e4ded3; }
      .subcategory-row { display: flex; align-items: center; gap: 6px; padding: 4px 0; }
      .sub-name { font-size: 13.5px; }

      .dash-input { border: 1px solid #e4ded3; border-radius: 8px; padding: 8px 10px; font-size: 13.5px; }
    `,
  ],
})
export class StoreCategoriesManagerComponent implements OnInit {
  private readonly sellerService = inject(SellerService);

  readonly storeId = input.required<string>();

  protected readonly categories = signal<StoreCategoryDTO[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly newCategoryName = signal('');
  protected readonly newSubcategoryName = signal('');
  protected readonly expandedCategoryId = signal<string | null>(null);

  protected readonly editingCategoryId = signal<string | null>(null);
  protected readonly editingCategoryName = signal('');
  protected readonly editingSubcategoryId = signal<string | null>(null);
  protected readonly editingSubcategoryName = signal('');

  ngOnInit(): void {
    // Required inputs aren't guaranteed set yet inside the constructor —
    // ngOnInit is the first hook Angular guarantees runs after them.
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const categories = await firstValueFrom(this.sellerService.getStoreCategories(this.storeId()));
      this.categories.set(categories);
    } catch {
      this.error.set('Could not load your store categories. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async createCategory(): Promise<void> {
    const name = this.newCategoryName().trim();
    if (!name) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const category = await firstValueFrom(this.sellerService.createStoreCategory(this.storeId(), { name }));
      this.categories.set([...this.categories(), category]);
      this.newCategoryName.set('');
    } catch {
      this.error.set('Could not create that category. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  protected toggleExpanded(categoryId: string): void {
    this.expandedCategoryId.set(this.expandedCategoryId() === categoryId ? null : categoryId);
  }

  protected startEditCategory(category: StoreCategoryDTO): void {
    this.editingCategoryId.set(category.id);
    this.editingCategoryName.set(category.name);
  }

  protected async saveCategoryName(category: StoreCategoryDTO): Promise<void> {
    const name = this.editingCategoryName().trim();
    this.editingCategoryId.set(null);
    if (!name || name === category.name) return;
    await this.patchCategory(category.id, { name });
  }

  protected async toggleCategoryVisible(category: StoreCategoryDTO): Promise<void> {
    await this.patchCategory(category.id, { visible: !category.visible });
  }

  protected async deleteCategory(category: StoreCategoryDTO): Promise<void> {
    if (!confirm(`Delete "${category.name}"? Products using it will keep their marketplace category, but lose this store category.`)) {
      return;
    }
    try {
      await firstValueFrom(this.sellerService.deleteStoreCategory(this.storeId(), category.id));
      this.categories.set(this.categories().filter((c) => c.id !== category.id));
    } catch {
      this.error.set('Could not delete that category. Please try again.');
    }
  }

  protected async moveCategory(index: number, direction: -1 | 1): Promise<void> {
    const list = [...this.categories()];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.categories.set(list);
    try {
      await firstValueFrom(
        this.sellerService.reorderStoreCategories(this.storeId(), list.map((c) => c.id)),
      );
    } catch {
      this.error.set('Could not save the new order. Please try again.');
      await this.load();
    }
  }

  private async patchCategory(categoryId: string, data: Parameters<SellerService['updateStoreCategory']>[2]): Promise<void> {
    try {
      const updated = await firstValueFrom(this.sellerService.updateStoreCategory(this.storeId(), categoryId, data));
      this.categories.set(this.categories().map((c) => (c.id === categoryId ? updated : c)));
    } catch {
      this.error.set('Could not save that change. Please try again.');
    }
  }

  protected async createSubcategory(category: StoreCategoryDTO): Promise<void> {
    const name = this.newSubcategoryName().trim();
    if (!name) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const updated = await firstValueFrom(
        this.sellerService.addStoreSubcategory(this.storeId(), category.id, name),
      );
      this.categories.set(this.categories().map((c) => (c.id === category.id ? updated : c)));
      this.newSubcategoryName.set('');
    } catch {
      this.error.set('Could not create that subcategory. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  protected startEditSubcategory(sub: { id: string; name: string }): void {
    this.editingSubcategoryId.set(sub.id);
    this.editingSubcategoryName.set(sub.name);
  }

  protected async saveSubcategoryName(category: StoreCategoryDTO, sub: { id: string; name: string }): Promise<void> {
    const name = this.editingSubcategoryName().trim();
    this.editingSubcategoryId.set(null);
    if (!name || name === sub.name) return;
    await this.patchSubcategory(category.id, sub.id, { name });
  }

  protected async toggleSubcategoryVisible(category: StoreCategoryDTO, sub: { id: string; visible: boolean }): Promise<void> {
    await this.patchSubcategory(category.id, sub.id, { visible: !sub.visible });
  }

  protected async deleteSubcategory(category: StoreCategoryDTO, sub: { id: string; name: string }): Promise<void> {
    if (!confirm(`Delete "${sub.name}"?`)) return;
    try {
      const updated = await firstValueFrom(
        this.sellerService.deleteStoreSubcategory(this.storeId(), category.id, sub.id),
      );
      this.categories.set(this.categories().map((c) => (c.id === category.id ? updated : c)));
    } catch {
      this.error.set('Could not delete that subcategory. Please try again.');
    }
  }

  protected async moveSubcategory(category: StoreCategoryDTO, index: number, direction: -1 | 1): Promise<void> {
    const subs = [...category.subcategories];
    const target = index + direction;
    if (target < 0 || target >= subs.length) return;
    [subs[index], subs[target]] = [subs[target], subs[index]];
    this.categories.set(
      this.categories().map((c) => (c.id === category.id ? { ...c, subcategories: subs } : c)),
    );
    try {
      const updated = await firstValueFrom(
        this.sellerService.reorderStoreSubcategories(this.storeId(), category.id, subs.map((s) => s.id)),
      );
      this.categories.set(this.categories().map((c) => (c.id === category.id ? updated : c)));
    } catch {
      this.error.set('Could not save the new order. Please try again.');
      await this.load();
    }
  }

  private async patchSubcategory(
    categoryId: string,
    subcategoryId: string,
    data: Parameters<SellerService['updateStoreSubcategory']>[3],
  ): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.sellerService.updateStoreSubcategory(this.storeId(), categoryId, subcategoryId, data),
      );
      this.categories.set(this.categories().map((c) => (c.id === categoryId ? updated : c)));
    } catch {
      this.error.set('Could not save that change. Please try again.');
    }
  }
}
