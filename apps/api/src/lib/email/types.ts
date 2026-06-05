/** Shared email transport contract. SES/SMTP can slot in behind EmailTransport. */

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body — always provided (the console transport logs this). */
  text: string;
  /** Optional HTML body — sent by real transports when present. */
  html?: string;
}

export interface EmailTransport {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}
