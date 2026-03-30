/** Safe hrefs for mailto / tel / sms (RFC 3966-style tel uses digits). */
export function mailtoHref(email: string): string {
  const e = email.trim();
  if (!e) return "";
  return `mailto:${encodeURIComponent(e)}`;
}

export function telHref(phone: string): string {
  const p = phone.trim();
  if (!p) return "";
  const digits = p.replace(/\D/g, "");
  if (!digits) return "";
  return `tel:${digits}`;
}

export function smsHref(phone: string): string {
  const t = telHref(phone);
  return t ? `sms:${t.slice("tel:".length)}` : "";
}
