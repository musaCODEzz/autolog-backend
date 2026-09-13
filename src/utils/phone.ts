/**
 * Normalizes Kenyan phone numbers from any common format into
 * the standard international E.164 format (+254XXXXXXXXX).
 */
export const formatKenyanPhone = (phone: string): string => {
  if (!phone) return phone;

  // 1. Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // 2. If already starts with +254, return as-is
  if (cleaned.startsWith('+254')) {
    return cleaned;
  }

  // 3. If starts with 254 (without +), prepend +
  if (cleaned.startsWith('254')) {
    return `+${cleaned}`;
  }

  // 4. If starts with local prefix (07... or 01...), drop the leading 0 and prepend +254
  if (cleaned.startsWith('07') || cleaned.startsWith('01')) {
    return `+254${cleaned.slice(1)}`;
  }

  return cleaned;
};

/**
 * Validates if a phone string matches a genuine Kenyan mobile number
 * (+254 followed by 1 or 7, followed by exactly 8 digits).
 */
export const isValidKenyanPhone = (phone: string): boolean => {
  const normalized = formatKenyanPhone(phone);
  return /^\+254[17]\d{8}$/.test(normalized);
};
