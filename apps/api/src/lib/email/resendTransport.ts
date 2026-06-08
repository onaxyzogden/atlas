/**
 * Resend email transport — production sender. Uses a plain fetch to the Resend
 * REST API so we add no new dependency (mirrors the codebase's other fetch-based
 * external calls). Created only when EMAIL_TRANSPORT=resend and RESEND_API_KEY
 * is set; otherwise the module falls back to the console transport.
 */

import type { EmailMessage, EmailTransport } from './types.js';

export function createResendTransport(apiKey: string, from: string): EmailTransport {
  return {
    name: 'resend',
    async send(msg: EmailMessage): Promise<void> {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: msg.to,
          subject: msg.subject,
          text: msg.text,
          ...(msg.html ? { html: msg.html } : {}),
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Resend send failed (${res.status}): ${detail}`);
      }
    },
  };
}
