# Ownership and parallel-work boundaries

| Area | Owner role | Primary paths |
| --- | --- | --- |
| Frontend platform | Frontend platform owner | `tools/`, `tsconfig.base.json`, shared Vite/Tailwind config |
| Auth | Identity owner | `apps/core/auth/` |
| Merchant | Merchant experience owner | `apps/core/merchant/` |
| Marketing | Growth owner | `apps/core/marketing/` |
| Storefront templates | Storefront owner | `apps/templates/ecommerce/`, `libs/storefront/` |
| Shared UI | Design-system owner | `libs/shared/src/ui/` |
| API clients/payments | Platform + payments owners | `libs/apis/`, `libs/checkout/` |
| QA | Quality owner | `e2e/`, `*.test.*`, `.github/workflows/` |

Assign one named reviewer for each owner role in repository settings. Changes
that cross rows require approval from every affected owner. Storefront work
must not import Merchant-only routes or APIs.
