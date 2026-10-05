/**
 * Extracts initials from a user's name or email.
 * - Single name (e.g. "ajinth") -> "A"
 * - Multi-word name (e.g. "ajinth kumar") -> "AK"
 * - Email fallback (e.g. "ajinth.kumar@gmail.com") -> "AK", ("ajinth@gmail.com") -> "A"
 * 
 * @param {string} nameOrEmail 
 * @param {string} fallback 
 * @returns {string} Initials in uppercase (1 to 2 characters)
 */
export const getUserInitials = (nameOrEmail, fallback = 'U') => {
  if (!nameOrEmail || typeof nameOrEmail !== 'string') return fallback;
  const clean = nameOrEmail.trim();
  if (!clean) return fallback;

  // If input is an email, extract local part
  const text = clean.includes('@') ? clean.split('@')[0] : clean;

  // Split by whitespace or punctuation delimiters (. _ -)
  const parts = text.split(/[\s._-]+/).filter(Boolean);

  if (parts.length === 0) return fallback;

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  // 2 or more names: take first letter of first word and first letter of second word
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};
