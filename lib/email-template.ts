function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderAppEmail(params: {
  title: string;
  greeting: string;
  lead: string;
  bullets?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  footnote?: string;
}): string {
  const bullets = params.bullets ?? [];
  const safeTitle = escapeHtml(params.title);
  const safeGreeting = escapeHtml(params.greeting);
  const safeLead = escapeHtml(params.lead);
  const safeFootnote = params.footnote ? escapeHtml(params.footnote) : "";
  const cta = params.ctaLabel && params.ctaHref
    ? `<a href="${escapeHtml(params.ctaHref)}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">${escapeHtml(params.ctaLabel)}</a>`
    : "";
  const bulletList = bullets.length
    ? `<ul style="margin:16px 0 20px;padding-left:20px;color:#334155;">${bullets
        .map((b) => `<li style="margin:6px 0;">${escapeHtml(b)}</li>`)
        .join("")}</ul>`
    : "";

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;">
                <p style="margin:0;font-size:12px;letter-spacing:.08em;opacity:.9;text-transform:uppercase;">SanaFathima Mansion</p>
                <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">${safeTitle}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px;font-size:16px;font-weight:600;">${safeGreeting}</p>
                <p style="margin:0;color:#334155;font-size:15px;line-height:1.6;">${safeLead}</p>
                ${bulletList}
                ${cta ? `<div style="margin:14px 0 10px;">${cta}</div>` : ""}
                ${safeFootnote ? `<p style="margin:14px 0 0;color:#64748b;font-size:13px;line-height:1.5;">${safeFootnote}</p>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
