/**
 * Console email transport — the default. Logs the full message (including any
 * action link) to stdout instead of sending real mail. Lets both the
 * verification and reset flows be exercised end-to-end locally with zero
 * external account. Tests mock the email module entirely, so this never runs
 * under vitest.
 */

import type { EmailMessage, EmailTransport } from './types.js';

export const consoleTransport: EmailTransport = {
  name: 'console',
  async send(msg: EmailMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      [
        '',
        '──────────────────────────────────────────────────────────────',
        '📧  [email:console] outbound message (no real mail sent)',
        `    to:      ${msg.to}`,
        `    subject: ${msg.subject}`,
        '    ----------------------------------------------------------',
        msg.text
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n'),
        '──────────────────────────────────────────────────────────────',
        '',
      ].join('\n'),
    );
  },
};
