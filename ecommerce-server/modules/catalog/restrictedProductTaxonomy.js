// ecommerce-server/modules/catalog/restrictedProductTaxonomy.js
// P5-TRUST-001: Versioned restricted and prohibited product taxonomy.
// Encodes DEC-006 prohibited goods categories, detection patterns,
// actionable merchant guidance in English & Khmer, and appeal policies.

const RESTRICTED_PRODUCT_TAXONOMY_VERSION = '1.0.0';

const RESTRICTED_CATEGORIES = Object.freeze({
  WEAPONS_EXPLOSIVES: {
    code: 'PROHIBITED_WEAPONS_EXPLOSIVES',
    categoryKey: 'weapons_and_explosives',
    name: 'Weapons, Firearms & Explosives',
    nameKh: 'អាវុធ គ្រាប់កាំភ្លើង និងជាតិផ្ទុះ',
    severity: 'prohibited',
    patterns: [
      /\b(?:firearms?|guns?|rifles?|pistols?|handguns?|ammunition|ammo|bullets?|shotguns?)\b/i,
      /\b(?:explosives?|dynamite|grenades?|landmines?|bombs?|fireworks?|pyrotechnics?)\b/i,
      /\b(?:switchblades?|brass\s+knuckles?|tasers?|stun\s+guns?|combat\s+knives?)\b/i,
      /\b(?:កាំភ្លើង|គ្រាប់កាំភ្លើង|ជាតិផ្ទុះ|មីន|គ្រាប់បែក|ផាវ|កាំជ្រួច)\b/u,
    ],
    guidanceEn: 'Listing of firearms, ammunition, military weaponry, explosives, and combat knives is strictly prohibited by Cambodian law and platform trust policy.',
    guidanceKh: 'ការដាក់លក់អាវុធ គ្រាប់កាំភ្លើង ជាតិផ្ទុះ និងកាំបិតប្រយុទ្ធ ត្រូវបានហាមឃាត់ដាច់ខាតក្រោមច្បាប់កម្ពុជា និងគោលការណ៍វេទិកា។',
    allowedAppeal: false,
  },

  ILLEGAL_NARCOTICS: {
    code: 'PROHIBITED_NARCOTICS',
    categoryKey: 'illegal_narcotics',
    name: 'Illegal Narcotics & Drug Paraphernalia',
    nameKh: 'គ្រឿងញៀនខុសច្បាប់ និងឧបករណ៍ជក់/ប្រើប្រាស់',
    severity: 'prohibited',
    patterns: [
      /\b(?:narcotics?|cocaine|heroin|methamphetamine|meth|crystal\s+meth|ice\s+drug|ecstasy|mdma)\b/i,
      /\b(?:cannabis|marijuana|weed|ganja|hashish|thc\s+oil|drug\s+paraphernalia|bongs?)\b/i,
      /\b(?:opium|ketamine|fentanyl|controlled\s+substances?)\b/i,
      /\b(?:គ្រឿងញៀន|កញ្ឆា|ម៉ាទឹកកក|យ៉ាម៉ា|អាភៀន)\b/u,
    ],
    guidanceEn: 'Listing of illegal drugs, controlled substances, and drug paraphernalia is strictly prohibited.',
    guidanceKh: 'ការដាក់លក់គ្រឿងញៀន សារធាតុញៀន និងឧបករណ៍ប្រើប្រាស់គ្រឿងញៀន ត្រូវបានហាមឃាត់ដាច់ខាត។',
    allowedAppeal: false,
  },

  COUNTERFEIT_GOODS: {
    code: 'PROHIBITED_COUNTERFEIT',
    categoryKey: 'counterfeit_goods',
    name: 'Counterfeit & Trademark-Infringing Goods',
    nameKh: 'ទំនិញក្លែងក្លាយ និងរំលោភកម្មសិទ្ធិបញ្ញា',
    severity: 'prohibited',
    patterns: [
      /\b(?:counterfeits?|fake\s+\w+|replicas?|bootleg|knockoffs?|aaa\s+replica|1:1\s+copy|clone\s+phone)\b/i,
      /\b(?:ទំនិញក្លែងក្លាយ|ចម្លង\s*១:១|ម៉ាកក្លែងក្លាយ)\b/u,
    ],
    guidanceEn: 'Sale of counterfeit, replica, or unauthorized branded goods violates intellectual property laws. If your product is authentic or licensed, you may submit proof of authorization via an appeal.',
    guidanceKh: 'ការលក់ទំនិញក្លែងក្លាយ ឬចម្លងម៉ាក រំលោភលើច្បាប់កម្មសិទ្ធិបញ្ញា។ ប្រសិនបើផលិតផលរបស់អ្នកជាទំនិញពិតប្រាកដ ឬមានអាជ្ញាប័ណ្ណត្រឹមត្រូវ អ្នកអាចដាក់ពាក្យឧទ្ធរណ៍ជាមួយឯកសារបញ្ជាក់។',
    allowedAppeal: true,
  },

  PROTECTED_WILDLIFE: {
    code: 'PROHIBITED_WILDLIFE_FLORA',
    categoryKey: 'protected_wildlife',
    name: 'Protected Wildlife & Endangered Flora',
    nameKh: 'សត្វព្រៃការពារ និងរុក្ខជាតិកម្រ',
    severity: 'prohibited',
    patterns: [
      /\b(?:ivory|elephant\s+tusk|rhino\s+horn|tiger\s+bone|tiger\s+skin|turtle\s+shell|pangolin|bear\s+bile)\b/i,
      /\b(?:endangered\s+species|protected\s+wildlife|bushmeat|croc\s+skin\s+unlicensed)\b/i,
      /\b(?:ភ្លុកដំរី|កុយរមាស|ឆ្អឹងខ្លា|ស្បែកខ្លា|ស្រកាពង្រូល|ប្រមាត់ខ្លាឃ្មុំ)\b/u,
    ],
    guidanceEn: 'Trading in protected wildlife, ivory, animal parts, and endangered flora violates biodiversity conservation laws and CITES regulations.',
    guidanceKh: 'ការជួញដូរសត្វព្រៃការពារ ភ្លុកដំរី ផ្នែកនៃសត្វព្រៃ និងរុក្ខជាតិជិតផុតពូជ ផ្ទុយពីច្បាប់ស្តីពីព្រៃឈើ និងសន្ធិសញ្ញា CITES។',
    allowedAppeal: false,
  },

  HUMAN_REMAINS: {
    code: 'PROHIBITED_HUMAN_REMAINS',
    categoryKey: 'human_remains',
    name: 'Human Remains & Body Parts',
    nameKh: 'អដ្ឋិធាតុ និងសរីរាង្គមនុស្ស',
    severity: 'prohibited',
    patterns: [
      /\b(?:human\s+remains|human\s+organs?|human\s+skulls?|human\s+bones?|blood\s+sales?|fetal\s+tissue)\b/i,
      /\b(?:សរីរាង្គមនុស្ស|ឆ្អឹងមនុស្ស|ឈាមមនុស្ស)\b/u,
    ],
    guidanceEn: 'Commercial trade in human remains, human organs, and bodily tissues is strictly prohibited.',
    guidanceKh: 'ការជួញដូរអដ្ឋិធាតុ សរីរាង្គមនុស្ស និងជាលិការាងកាយ ត្រូវបានហាមឃាត់ដាច់ខាត។',
    allowedAppeal: false,
  },

  ADULT_SERVICES_PORNOGRAPHY: {
    code: 'PROHIBITED_ADULT_CONTENT',
    categoryKey: 'adult_services_pornography',
    name: 'Adult Sexual Services & Pornography',
    nameKh: 'សេវាផ្លូវភេទមនុស្សពេញវ័យ និងរូបភាពអាសអាភាស',
    severity: 'prohibited',
    patterns: [
      /\b(?:pornograph(?:y|ic)|porn|sex\s+work|sexual\s+services?|escort\s+service|sex\s+toys?|erotic\s+massages?)\b/i,
      /\b(?:explicit\s+adult|xxx\s+videos?|fetish\s+gear)\b/i,
      /\b(?:រូបភាពអាសអាភាស|សេវាផ្លូវភេទ)\b/u,
    ],
    guidanceEn: 'Pornographic media, sexually explicit items, and adult escort/sexual services are strictly prohibited on the platform.',
    guidanceKh: 'រូបភាព ឬវីដេអូអាសអាភាស និងសេវាផ្លូវភេទ ត្រូវបានហាមឃាត់ដាច់ខាតលើវេទិកា។',
    allowedAppeal: false,
  },

  TOXIC_CHEMICALS: {
    code: 'PROHIBITED_HAZARDOUS_MATERIALS',
    categoryKey: 'toxic_chemicals',
    name: 'Toxic Chemicals & Hazardous Substances',
    nameKh: 'សារធាតុគីមីពុល និងសារធាតុគ្រោះថ្នាក់',
    severity: 'prohibited',
    patterns: [
      /\b(?:cyanide|toxic\s+poisons?|radioactive\s+materials?|mercury\s+liquid|asbestos|sarin|chlorine\s+gas)\b/i,
      /\b(?:hazardous\s+chemicals?|chemical\s+weapons?)\b/i,
      /\b(?:សារធាតុពុល|ស៊ីយ៉ានួរ|ជាតិគីមីគ្រោះថ្នាក់)\b/u,
    ],
    guidanceEn: 'Sale of industrial poisons, radioactive materials, and hazardous toxic chemicals is prohibited without certified government clearance.',
    guidanceKh: 'ការលក់សារធាតុពុលឧស្សាហកម្ម សារធាតុវិទ្យុសកម្ម និងសារធាតុគីមីគ្រោះថ្នាក់ ត្រូវបានហាមឃាត់ដោយគ្មានលិខិតអនុញ្ញាត។',
    allowedAppeal: true,
  },

  UNLICENSED_MEDICATIONS: {
    code: 'PROHIBITED_UNLICENSED_MEDICINE',
    categoryKey: 'unlicensed_medications',
    name: 'Unlicensed Prescription Drugs & Pharmaceuticals',
    nameKh: 'ឱសថតាមវេជ្ជបញ្ជាគ្មានអាជ្ញាប័ណ្ណ',
    severity: 'prohibited',
    patterns: [
      /\b(?:prescription\s+(?:drugs?|pills?|medications?|antibiotics?)|controlled\s+medications?|anabolic\s+steroids?|antibiotics?)\b/i,
      /\b(?:unapproved\s+drugs?|injectable\s+steroids?|prescription\s+pills?)\b/i,
      /\b(?:ថ្នាំតាមវេជ្ជបញ្ជា|ថ្នាំពេទ្យគ្មានច្បាប់)\b/u,
    ],
    guidanceEn: 'Prescription pharmaceuticals and regulated medicines cannot be sold without verified Ministry of Health licensing and doctor prescription protocols.',
    guidanceKh: 'ឱសថតាមវេជ្ជបញ្ជា និងឱសថគ្រប់គ្រង មិនអាចលក់ដោយគ្មានអាជ្ញាប័ណ្ណពីក្រសួងសុខាភិបាលឡើយ។',
    allowedAppeal: true,
  },
});

/**
 * Normalizes text input for deterministic pattern matching.
 */
function normalizeText(text) {
  if (text === null || text === undefined) return '';
  return String(text).toLowerCase().normalize('NFC').trim();
}

/**
 * Evaluates a product input payload against the restricted-product taxonomy.
 *
 * @param {Object} input - { name, description, shortDescription, tags, marketplaceCategory, category }
 * @returns {Object} { compliant, requiresHold, matchedCategories, primaryReasonCode, guidance, guidanceKh, canAppeal }
 */
function evaluateProductPolicy(input = {}) {
  const parts = [
    normalizeText(input.name),
    normalizeText(input.description),
    normalizeText(input.shortDescription),
    normalizeText(input.marketplaceCategory),
    normalizeText(input.category),
    Array.isArray(input.tags) ? input.tags.map(normalizeText).join(' ') : normalizeText(input.tags),
  ];

  const searchableText = parts.filter(Boolean).join(' ');
  const matched = [];

  for (const [key, category] of Object.entries(RESTRICTED_CATEGORIES)) {
    for (const pattern of category.patterns) {
      if (pattern.test(searchableText)) {
        matched.push({
          categoryKey: category.categoryKey,
          code: category.code,
          name: category.name,
          nameKh: category.nameKh,
          severity: category.severity,
          guidanceEn: category.guidanceEn,
          guidanceKh: category.guidanceKh,
          allowedAppeal: category.allowedAppeal,
        });
        break; // Match category once
      }
    }
  }

  if (matched.length === 0) {
    return {
      compliant: true,
      requiresHold: false,
      taxonomyVersion: RESTRICTED_PRODUCT_TAXONOMY_VERSION,
      matchedCategories: [],
      primaryReasonCode: null,
      guidance: null,
      guidanceKh: null,
      canAppeal: false,
    };
  }

  const primary = matched[0];
  return {
    compliant: false,
    requiresHold: true,
    taxonomyVersion: RESTRICTED_PRODUCT_TAXONOMY_VERSION,
    matchedCategories: matched,
    primaryReasonCode: primary.code,
    guidance: primary.guidanceEn,
    guidanceKh: primary.guidanceKh,
    canAppeal: primary.allowedAppeal,
  };
}

/**
 * Returns complete guidance catalog for merchant pre-submission validation.
 */
function getTaxonomyGuidance() {
  return {
    version: RESTRICTED_PRODUCT_TAXONOMY_VERSION,
    categories: Object.values(RESTRICTED_CATEGORIES).map((cat) => ({
      code: cat.code,
      name: cat.name,
      nameKh: cat.nameKh,
      severity: cat.severity,
      guidanceEn: cat.guidanceEn,
      guidanceKh: cat.guidanceKh,
      allowedAppeal: cat.allowedAppeal,
    })),
  };
}

module.exports = {
  RESTRICTED_PRODUCT_TAXONOMY_VERSION,
  RESTRICTED_TAXONOMY_VERSION: RESTRICTED_PRODUCT_TAXONOMY_VERSION,
  RESTRICTED_CATEGORIES,
  evaluateProductPolicy,
  getTaxonomyGuidance,
};
