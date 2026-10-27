/**
 * Zalo deep links use the local Vietnamese number format (0xxxxxxxxx).
 * Accepts the raw value stored on the profile (spaces, dots, +84, 0084…) and
 * returns `null` when there is no usable number, so callers can hide the icon
 * instead of rendering a broken link.
 */
export const normalizeZaloPhone = (raw?: string | null): string | null => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("0084")) local = `0${local.slice(4)}`;
  else if (local.startsWith("84") && local.length >= 11) local = `0${local.slice(2)}`;

  // Vietnamese numbers are 10 digits (some legacy landlines are 11).
  if (local.length < 9 || local.length > 11) return null;
  return local;
};

export const getZaloUrl = (raw?: string | null): string | null => {
  const phone = normalizeZaloPhone(raw);
  return phone ? `https://zalo.me/${phone}` : null;
};
