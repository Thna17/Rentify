// Shared phone number utilities optimized for Cambodian mobile carriers & international E.164
export interface OperatorInfo {
  name: 'Cellcard' | 'Smart' | 'Metfone' | 'Cootel';
  color: string;
  badgeBg: string;
  badgeText: string;
}

export interface CountryCode {
  iso: string;
  name: string;
  nameKh: string;
  callingCode: string;
  flag: string;
  placeholder: string;
}

export const SUPPORTED_COUNTRIES: CountryCode[] = [
  { iso: 'KH', name: 'Cambodia', nameKh: 'កម្ពុជា', callingCode: '+855', flag: '🇰🇭', placeholder: '096 984 9988' },
  { iso: 'US', name: 'United States', nameKh: 'សហរដ្ឋអាមេរិក', callingCode: '+1', flag: '🇺🇸', placeholder: '(555) 000-0000' },
  { iso: 'TH', name: 'Thailand', nameKh: 'ថៃ', callingCode: '+66', flag: '🇹🇭', placeholder: '081 234 5678' },
  { iso: 'VN', name: 'Vietnam', nameKh: 'វៀតណាម', callingCode: '+84', flag: '🇻🇳', placeholder: '091 234 5678' },
  { iso: 'SG', name: 'Singapore', nameKh: 'សិង្ហបុរី', callingCode: '+65', flag: '🇸🇬', placeholder: '8123 4567' },
  { iso: 'MY', name: 'Malaysia', nameKh: 'ម៉ាឡេស៊ី', callingCode: '+60', flag: '🇲🇾', placeholder: '012 345 6789' },
  { iso: 'CN', name: 'China', nameKh: 'ចិន', callingCode: '+86', flag: '🇨🇳', placeholder: '138 0000 0000' },
  { iso: 'JP', name: 'Japan', nameKh: 'ជប៉ុន', callingCode: '+81', flag: '🇯🇵', placeholder: '090 1234 5678' },
  { iso: 'KR', name: 'South Korea', nameKh: 'កូរ៉េខាងត្បូង', callingCode: '+82', flag: '🇰🇷', placeholder: '010 1234 5678' },
  { iso: 'GB', name: 'United Kingdom', nameKh: 'ចក្រភពអង់គ្លេស', callingCode: '+44', flag: '🇬🇧', placeholder: '07911 123456' },
  { iso: 'AU', name: 'Australia', nameKh: 'អូស្ត្រាលី', callingCode: '+61', flag: '🇦🇺', placeholder: '0412 345 678' },
  { iso: 'FR', name: 'France', nameKh: 'បារាំង', callingCode: '+33', flag: '🇫🇷', placeholder: '06 12 34 56 78' },
];

/**
 * Sanitizes any phone input into canonical Cambodian format for backend storage:
 * '855' + 8 or 9 digits (no '+', no leading '0').
 */
export const sanitizePhoneNumber = (phone: string): string => {
  let digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('855')) {
    return digits;
  }

  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  return '855' + digits;
};

/**
 * Converts any phone input into canonical E.164 with international '+' prefix:
 * e.g. '0969849988' -> '+855969849988'
 *      '969849988'  -> '+855969849988'
 *      '+855969849988' -> '+855969849988'
 */
export const toCanonicalE164 = (phone: string, defaultCallingCode = '+855'): string => {
  const clean = (phone || '').trim();
  if (!clean) return '';

  // If already has '+' country code
  if (clean.startsWith('+')) {
    return clean.replace(/[^\d+]/g, '');
  }

  const digits = clean.replace(/\D/g, '');
  if (digits.startsWith('855')) {
    return `+${digits.substring(0, 12)}`;
  }
  if (digits.startsWith('0')) {
    return `+855${digits.substring(1, 10)}`;
  }
  return `+855${digits.substring(0, 9)}`;
};

/**
 * Returns national digits without country code or leading zero.
 * e.g., '85512345678' -> '12345678'
 *       '0969849988'  -> '969849988'
 */
export const getNationalDigits = (phone: string): string => {
  const sanitized = sanitizePhoneNumber(phone);
  if (sanitized.startsWith('855')) {
    return sanitized.substring(3);
  }
  return sanitized;
};

/**
 * Validates whether the number conforms to standard Cambodian mobile format:
 * 855 followed by 8 or 9 subscriber digits (total 11 or 12 digits).
 * Handles '0969849988', '969849988', '+855969849988', etc.
 */
export const validateCambodianPhone = (phone: string): boolean => {
  const sanitized = sanitizePhoneNumber(phone);
  return /^855[1-9]\d{7,8}$/.test(sanitized);
};

/**
 * Formats phone number for display with country code:
 * e.g. +855 12 345 678 or +855 96 984 9988
 */
export const formatCambodianPhone = (input: string): string => {
  const national = getNationalDigits(input);
  if (!national) return '';

  if (national.length <= 2) {
    return `+855 ${national}`;
  }
  if (national.length <= 5) {
    return `+855 ${national.substring(0, 2)} ${national.substring(2)}`;
  }
  if (national.length <= 8) {
    return `+855 ${national.substring(0, 2)} ${national.substring(2, 5)} ${national.substring(5)}`;
  }
  // 9-digit national subscriber number (e.g. 96 984 9988)
  return `+855 ${national.substring(0, 2)} ${national.substring(2, 5)} ${national.substring(5, 9)}`;
};

/**
 * Formats phone number in local format:
 * e.g. 012 345 678 or 096 984 9988
 */
export const formatLocalPhone = (input: string): string => {
  const national = getNationalDigits(input);
  if (!national) return '';

  if (national.length <= 2) {
    return `0${national}`;
  }
  if (national.length <= 5) {
    return `0${national.substring(0, 2)} ${national.substring(2)}`;
  }
  if (national.length <= 8) {
    return `0${national.substring(0, 2)} ${national.substring(2, 5)} ${national.substring(5)}`;
  }
  return `0${national.substring(0, 2)} ${national.substring(2, 5)} ${national.substring(5, 9)}`;
};

/**
 * Detects the Cambodian cellular network operator based on subscriber prefix.
 * Smart: 010, 015, 016, 069, 070, 081, 086, 087, 093, 096, 098
 * Cellcard: 011, 012, 014, 017, 061, 076, 077, 078, 079, 085, 089, 092, 095, 099
 * Metfone: 088, 097, 071, 068, 067, 066, 060, 090, 031
 */
export const detectCambodianOperator = (phone: string): OperatorInfo | null => {
  const national = getNationalDigits(phone);
  if (national.length < 2) return null;

  const prefix2 = national.substring(0, 2);

  // Smart Axiata
  const smartPrefixes = ['10', '15', '16', '69', '70', '81', '86', '87', '93', '96', '98'];
  if (smartPrefixes.includes(prefix2)) {
    return {
      name: 'Smart',
      color: '#00A859',
      badgeBg: 'bg-emerald-50 border-emerald-200',
      badgeText: 'text-emerald-700',
    };
  }

  // Cellcard
  const cellcardPrefixes = ['11', '12', '14', '17', '61', '76', '77', '78', '79', '85', '89', '92', '95', '99'];
  if (cellcardPrefixes.includes(prefix2)) {
    return {
      name: 'Cellcard',
      color: '#FF6600',
      badgeBg: 'bg-orange-50 border-orange-200',
      badgeText: 'text-orange-700',
    };
  }

  // Metfone (including 031)
  const metfonePrefixes = ['88', '97', '71', '68', '67', '66', '60', '90', '31'];
  if (metfonePrefixes.includes(prefix2)) {
    return {
      name: 'Metfone',
      color: '#CC0000',
      badgeBg: 'bg-rose-50 border-rose-200',
      badgeText: 'text-rose-700',
    };
  }

  // Cootel
  if (prefix2 === '38') {
    return {
      name: 'Cootel',
      color: '#0066CC',
      badgeBg: 'bg-sky-50 border-sky-200',
      badgeText: 'text-sky-700',
    };
  }

  return null;
};

/**
 * Masks a phone number or email for privacy in verification displays:
 * e.g. '+855969849988' -> '+855 96 •••• 988'
 *      '0969849988'    -> '096 •••• 988'
 *      'sokha.chan@gmail.com' -> 's•••••n@gmail.com'
 */
export const maskContact = (contact: string): string => {
  const trimmed = (contact || '').trim();
  if (!trimmed) return '';

  if (trimmed.includes('@')) {
    const [user, domain] = trimmed.split('@');
    if (!user || !domain) return trimmed;
    if (user.length <= 2) {
      return `${user[0]}*@${domain}`;
    }
    const visibleStart = user.slice(0, 1);
    const visibleEnd = user.slice(-1);
    const maskedLength = Math.max(user.length - 2, 4);
    const asterisks = '•'.repeat(maskedLength);
    return `${visibleStart}${asterisks}${visibleEnd}@${domain}`;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('855') && digits.length >= 11) {
    const prefix = digits.slice(3, 5);
    const suffix = digits.slice(-3);
    return `+855 ${prefix} •••• ${suffix}`;
  }
  if (digits.startsWith('0') && digits.length >= 9) {
    const prefix = digits.slice(0, 3);
    const suffix = digits.slice(-3);
    return `${prefix} •••• ${suffix}`;
  }
  if (trimmed.length > 6) {
    return `${trimmed.slice(0, 3)} •••• ${trimmed.slice(-3)}`;
  }
  return trimmed;
};
