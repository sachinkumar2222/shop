/**
 * Normalize a phone number to the +91XXXXXXXXXX format.
 * Handles:
 *   "9829012345"        → "+919829012345"
 *   "09829012345"       → "+919829012345"
 *   "+919829012345"     → "+919829012345"
 *   "919829012345"      → "+919829012345"
 */
export const normalizePhone = (phone) => {
  if (!phone) return null;

  // Remove all spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-().]/g, '');

  // Already has +91
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return cleaned;
  }

  // Starts with 91 (no +)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  // Starts with 0 (local format)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+91${cleaned.slice(1)}`;
  }

  // Plain 10-digit number
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // Return as-is if we can't normalize (validation will catch it)
  return cleaned;
};
