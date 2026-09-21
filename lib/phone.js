// Bangladesh mobile numbers: 01[3-9]XXXXXXXX (11 digits).
// Accepts 01712345678, +8801712345678, 8801712345678, 008801712345678 and
// common separators (spaces, dashes, dots, brackets). Returns the number as
// 01XXXXXXXXX, or null when it isn't a valid BD mobile number.
export function normalizeBdPhone(input) {
  let s = String(input ?? '').trim();
  if (!/^\+?[\d\s\-().]+$/.test(s)) return null;    // one optional leading '+', no letters
  s = s.replace(/[^\d]/g, '');
  if (s.startsWith('00880')) s = s.slice(4);
  else if (s.startsWith('880')) s = s.slice(2);
  return /^01[3-9]\d{8}$/.test(s) ? s : null;
}

export const PHONE_ERROR = 'Enter a valid Bangladesh mobile number, e.g. 01712345678.';
