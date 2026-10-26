# Internationalization and Localization Policy (P4-UX-002)

## 1. Scope and Multi-Tenant Language Support

Rentify's customer-facing surfaces (`marketplace-frontend` and `rentify-frontend` storefronts/POS) support full bilingual operation in **English (`en`)** and **Khmer (`km`)**.

| Domain / Channel | English (`en`) | Khmer (`km`) |
| :--- | :--- | :--- |
| **Marketplace Discovery & Checkout** | Full catalog, search, cart, COD checkout, order details | 100% key parity with Cambodian commerce vocabulary |
| **Hosted Storefronts & POS** | Catalog, cart, checkout, confirmation, POS register | 100% key parity with Cambodian commerce vocabulary |
| **Error Handling** | Sanitized, polite plain-language messages | Localized plain-language messages with zero technical leaks |

---

## 2. Standard Cambodian Commerce Vocabulary

To avoid conflicting or unnatural phrasing, the following vocabulary standards are strictly enforced across all customer surfaces:

| English Concept | Standard Khmer Term | Usage & Context |
| :--- | :--- | :--- |
| **Cash on Delivery (COD)** | ទូទាត់ជាសាច់ប្រាក់ពេលទទួលទំនិញ (COD) | Delivery and payment method label |
| **Cart / Shopping Cart** | កន្ត្រកទំនិញ / កន្ត្រករបស់អ្នក | Navigation bar and cart summary headers |
| **Subtotal** | សរុបរង | Order financial breakdown |
| **Delivery Fee** | ថ្លៃដឹកជញ្ជូន | Seller shipping fee line |
| **Exact Total** | តម្លៃសរុបពិតប្រាកដ | Final confirmed amount due at checkout |
| **In Stock** | មានក្នុងស្តុក | Product availability badge |
| **Out of Stock** | អស់ពីស្តុក | Product availability badge |
| **Low Stock Alert** | នៅសល់តែ {count} ទៀតប៉ុណ្ណោះ | Urgency badge when stock $\le$ 3 |
| **Place Order** | បញ្ជាទិញឥឡូវនេះ | Primary checkout action button |
| **My Orders** | ការបញ្ជាទិញរបស់ខ្ញុំ | Account and order history section |
| **Return Request** | សំណើសុំប្រគល់ទំនិញវិញ | Post-delivery return workflow |
| **Issue Report / Complaint** | របាយការណ៍បញ្ហា | Customer complaint filing |
| **Invoice** | វិក្កយបត្រ | Formal commercial invoice |
| **Quote** | ការប៉ាន់ស្មានតម្លៃ | Non-binding pre-order quotation |

---

## 3. Locale-Aware Formatting

Locale-aware formatting is provided by [`FormatService`](file:///Users/macbookpro/Desktop/Development/Rentify-P4-Customer/marketplace-frontend/src/app/core/i18n/format.service.ts) and reactive pipes:

### Currency & Money
- **USD ($)**: The primary currency of Cambodian commerce.
  - Standard English: `$45.00` / `$1,250.50`
  - Standard Khmer: `$45.00` / `$៤៥.០០` (with Khmer numerals when requested)
- **KHR (៛)**: Cambodian Riel.
  - Standard English: `4,000 KHR`
  - Standard Khmer: `៤,០០០ ៛`

### Numerals
- Converts standard Arabic numerals (`0-9`) to Khmer digits (`០-៩`) via `FormatService.toKhmerDigits()`.

### Dates & Times
- English format: `Oct 26, 2026` / `2:30 PM`
- Khmer format: `២៦ តុលា ២០២៦` / `២:៣០ រសៀល`
  - Includes built-in fallback for Khmer month names (`មករា`, `កុម្ភៈ`, `មីនា`, `មេសា`, `ឧសភា`, `មិថុនា`, `កក្កដា`, `សីហា`, `កញ្ញា`, `តុលា`, `វិច្ឆិកា`, `ធ្នូ`) to guard environments lacking complete ICU data.

---

## 4. Technical Error Sanitization & Plain-Language Mapping

Technical stack traces, database identifiers, and raw translation keys must never leak to customers:

1. **Database & Connection Errors**:
   - `SequelizeConnectionRefusedError`, `ECONNREFUSED`, SQL syntax errors $\rightarrow$ *"Our services are temporarily busy. Please wait a moment and try again."* (English) / *"ប្រព័ន្ធកំពុងមមាញឹកបណ្តោះអាសន្ន។ សូមរង់ចាំមួយភ្លែត ហើយព្យាយាមម្តងទៀត។"* (Khmer).
2. **Network Failures (Status 0)**:
   - Disconnected network $\rightarrow$ *"Network connection lost. Please check your internet connection and try again."* (English) / *"ដាច់ការតភ្ជាប់បណ្តាញ។ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិតរបស់អ្នក ហើយព្យាយាមម្តងទៀត។"* (Khmer).
3. **Stock & Concurrency Conflicts (Status 409)**:
   - Depleted inventory $\rightarrow$ Translated domain message or *"Item availability changed. Please review before proceeding."* (English) / *"ចំនួនស្តុកទំនិញ ឬតម្លៃបានផ្លាស់ប្តូរ។ សូមពិនិត្យឡើងវិញមុនពេលបន្ត។"* (Khmer).
4. **Raw Key Prevention**:
   - Un-interpolated strings matching `^[a-z0-9_-]+(\.[a-z0-9_-]+)+$` are detected and sanitized.

---

## 5. CI Enforcement Gates

- [`i18n-enforcement.spec.ts`](file:///Users/macbookpro/Desktop/Development/Rentify-P4-Customer/marketplace-frontend/src/app/core/i18n/i18n-enforcement.spec.ts) enforces 100% catalog key parity between `EN_TRANSLATIONS` and `KM_TRANSLATIONS`.
- [`i18nEnforcement.test.js`](file:///Users/macbookpro/Desktop/Development/Rentify-P4-Customer/rentify-frontend/libs/utils/src/locales/i18nEnforcement.test.js) enforces 100% catalog key parity across customer-facing sections in `rentify-frontend`.
- Tests verify long-Khmer-text layout resilience under constrained container widths.
