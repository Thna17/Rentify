import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { SellerService, SellerStore } from '../../../core/api/seller.service';
import { AuthService, apiErrorMessage } from '../../../core/auth/auth.service';

type OnboardingStep = 1 | 2 | 3 | 4 | 5;
type PlanKey = 'STARTER' | 'STANDARD' | 'PREMIUM';
type PaymentKey = 'FREE' | 'ABA';

interface StoreDraft {
  storeName: string;
  category: string;
  location: string;
  phoneNumber: string;
  storeDescription: string;
}

const DRAFT_KEY = 'khmercraft.store-onboarding-draft.v2';

@Component({
  selector: 'app-seller-onboarding',
  imports: [FormsModule, RouterLink, KcIcon],
  templateUrl: './seller-onboarding.html',
  styleUrl: './seller-onboarding.css',
})
export class SellerOnboardingPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly sellerService = inject(SellerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly user = this.auth.user;
  protected readonly step = signal<OnboardingStep>(1);
  protected readonly selectedPlan = signal<PlanKey>('STARTER');
  protected readonly selectedPayment = signal<PaymentKey>('FREE');
  protected readonly existingStores = signal<SellerStore[]>([]);
  protected readonly createdStore = signal<SellerStore | null>(null);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly submitError = signal('');
  protected readonly submitting = signal(false);
  protected readonly draftRestored = signal(false);
  protected readonly termsAccepted = signal(false);

  protected form: StoreDraft = {
    storeName: '',
    category: '',
    location: '',
    phoneNumber: '',
    storeDescription: '',
  };

  protected readonly progress = [
    { step: 1 as const, label: 'Store essentials' },
    { step: 2 as const, label: 'Your storefront' },
    { step: 3 as const, label: 'Choose a plan' },
    { step: 4 as const, label: 'Review & create' },
  ];

  protected readonly categories = [
    'Fashion & Accessories',
    'Food & Groceries',
    'Home & Living',
    'Beauty & Wellness',
    'Electronics',
    'Kids & Family',
    'Arts & Culture',
  ];

  protected readonly locations = [
    'Phnom Penh',
    'Siem Reap',
    'Battambang',
    'Kampong Cham',
    'Kampong Speu',
    'Kandal',
    'Kampot',
    'Takeo',
    'Other province',
  ];

  protected readonly plans: Array<{
    key: PlanKey;
    name: string;
    price: number;
    description: string;
    badge?: string;
    features: string[];
  }> = [
    {
      key: 'STARTER',
      name: 'Starter',
      price: 0,
      description: 'A complete storefront for a new or small business.',
      features: ['Publish and manage products', 'Receive and manage orders', 'Store profile and customer reviews'],
    },
    {
      key: 'STANDARD',
      name: 'Growth',
      price: 12,
      description: 'More visibility and insight for a growing catalogue.',
      badge: 'Most popular',
      features: ['Everything in Starter', 'Expanded sales insights', 'Priority marketplace support'],
    },
    {
      key: 'PREMIUM',
      name: 'Professional',
      price: 29,
      description: 'Support and tools for an established store operation.',
      features: ['Everything in Growth', 'Professional onboarding support', 'Early access to new seller tools'],
    },
  ];

  protected readonly currentPlan = computed(() =>
    this.plans.find((plan) => plan.key === this.selectedPlan()) ?? this.plans[0],
  );

  protected readonly progressPercent = computed(() =>
    this.step() === 5 ? 100 : Math.max(8, ((this.step() - 1) / 4) * 100),
  );

  protected storeInitials(): string {
    const value = this.form.storeName.trim();
    if (!value) return 'KS';
    return value
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  protected readonly isAdditionalStore = computed(() => this.existingStores().length > 0);

  ngOnInit(): void {
    this.restoreDraft();
    this.applyEntryContext();
    this.sellerService.getMyStores().subscribe({
      next: (stores) => this.existingStores.set(stores),
      error: () => this.existingStores.set([]),
    });
  }

  protected next(): void {
    if (!this.validateStep(this.step())) return;
    this.errors.set({});
    this.submitError.set('');
    this.step.update((value) => Math.min(4, value + 1) as OnboardingStep);
    this.scrollToTop();
  }

  protected back(): void {
    this.errors.set({});
    this.submitError.set('');
    this.step.update((value) => Math.max(1, value - 1) as OnboardingStep);
    this.scrollToTop();
  }

  protected goTo(target: OnboardingStep): void {
    if (target >= this.step() || target === 5) return;
    this.errors.set({});
    this.step.set(target);
    this.scrollToTop();
  }

  protected selectPlan(plan: PlanKey): void {
    this.selectedPlan.set(plan);
    this.selectedPayment.set(plan === 'STARTER' ? 'FREE' : 'ABA');
    this.saveDraft();
  }

  protected updateTerms(value: boolean): void {
    this.termsAccepted.set(value);
    if (value) this.errors.update(({ terms, ...rest }) => rest);
  }

  protected saveDraft(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: this.form, selectedPlan: this.selectedPlan() }));
  }

  protected discardDraft(): void {
    this.form = { storeName: '', category: '', location: '', phoneNumber: '', storeDescription: '' };
    this.selectedPlan.set('STARTER');
    this.selectedPayment.set('FREE');
    this.draftRestored.set(false);
    this.errors.set({});
    if (typeof localStorage !== 'undefined') localStorage.removeItem(DRAFT_KEY);
  }

  protected async createStore(): Promise<void> {
    if (!this.validateStep(4)) return;
    this.submitting.set(true);
    this.submitError.set('');

    try {
      const plan = this.selectedPlan();
      const store = await firstValueFrom(this.sellerService.createStore({
        storeName: this.form.storeName.trim(),
        storeDescription: this.form.storeDescription.trim(),
        category: this.form.category,
        location: this.form.location,
        phoneNumber: this.fullPhoneNumber(),
        subscriptionPlan: plan,
        paymentMethod: plan === 'STARTER' ? 'FREE' : 'ABA',
      }));

      this.createdStore.set(store);
      if (typeof localStorage !== 'undefined') localStorage.removeItem(DRAFT_KEY);
      await firstValueFrom(this.auth.refreshCurrentUser());
      this.step.set(5);
      this.scrollToTop();
    } catch (error: unknown) {
      this.submitError.set(apiErrorMessage(error, 'We could not create your store. Check your details and try again.'));
    } finally {
      this.submitting.set(false);
    }
  }

  protected openDashboard(): void {
    const store = this.createdStore();
    void this.router.navigate(['/seller/dashboard'], { queryParams: store ? { storeId: store.id } : undefined });
  }

  protected storeRoute(): string[] {
    const store = this.createdStore();
    return ['/stores', store?.slug || store?.id || ''];
  }

  protected fieldError(name: string): string {
    return this.errors()[name] ?? '';
  }

  protected fullPhoneNumber(): string {
    const localNumber = this.form.phoneNumber.trim().replace(/^\+?855\s*/, '');
    return `+855 ${localNumber}`;
  }

  private validateStep(step: OnboardingStep): boolean {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (this.form.storeName.trim().length < 2) errors['storeName'] = 'Enter a store name with at least 2 characters.';
      if (!this.form.category) errors['category'] = 'Choose the main category for this store.';
      if (!this.form.location) errors['location'] = 'Choose where this store operates.';
      if (!/^\+?[0-9\s-]{8,30}$/.test(this.form.phoneNumber.trim())) errors['phoneNumber'] = 'Enter a valid contact number.';
    }
    if (step === 2 && this.form.storeDescription.trim().length < 20) {
      errors['storeDescription'] = 'Write at least 20 characters so buyers understand what you sell.';
    }
    if (step === 4 && !this.termsAccepted()) errors['terms'] = 'Please accept the seller terms before creating the store.';
    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  private restoreDraft(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { form?: Partial<StoreDraft>; selectedPlan?: PlanKey };
      this.form = { ...this.form, ...saved.form };
      if (saved.selectedPlan && this.plans.some((plan) => plan.key === saved.selectedPlan)) this.selectPlan(saved.selectedPlan);
      this.draftRestored.set(Boolean(this.form.storeName || this.form.storeDescription));
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }

  private applyEntryContext(): void {
    const params = this.route.snapshot.queryParamMap;
    const plan = params.get('plan') as PlanKey | null;
    if (plan && this.plans.some((item) => item.key === plan)) this.selectPlan(plan);

    const entryValues: Partial<StoreDraft> = {
      storeName: params.get('storeName') ?? undefined,
      category: params.get('category') ?? undefined,
      location: params.get('location') ?? undefined,
      phoneNumber: params.get('phoneNumber')?.replace(/^\+?855\s*/, '') ?? undefined,
    };
    for (const [key, value] of Object.entries(entryValues) as Array<[keyof StoreDraft, string | undefined]>) {
      if (value && !this.form[key]) this.form[key] = value;
    }
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
