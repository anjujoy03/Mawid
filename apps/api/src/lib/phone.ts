const ARABIC_INDIC_ZERO = 0x0660; // ٠
const PERSIAN_ZERO = 0x06f0; // ۰ — some Android keyboards send these

export function toLatinDigits(input: string) {
  return input.replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code >= PERSIAN_ZERO ? PERSIAN_ZERO : ARABIC_INDIC_ZERO;
    return String(code - base);
  });
}

/**
 * Accepts the many ways people type a Saudi mobile number
 * (05xxxxxxxx, 5xxxxxxxx, +9665..., 009665..., with spaces or Arabic digits)
 * and returns the international form WhatsApp expects: 9665xxxxxxxx.
 */
export function normalizeSaudiMobile(raw: string): string | null {
  let digits = toLatinDigits(raw).replace(/[^\d]/g, '');

  if (digits.startsWith('00966')) digits = digits.slice(5);
  else if (digits.startsWith('966')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  return /^5\d{8}$/.test(digits) ? `966${digits}` : null;
}
