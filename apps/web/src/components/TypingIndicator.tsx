/**
 * TypingIndicator — floating overlay showing who is currently drawing/editing.
 *
 * Positioned at the bottom-center of the map. Renders null when nobody is typing.
 * Gated behind MULTI_USER flag.
 */

import { FLAGS } from '@ogden/shared';
import { usePresenceStore } from '../store/presenceStore.js';
import css from './TypingIndicator.module.css';

export default function TypingIndicator() {
  const users = usePresenceStore((s) => s.users);

  if (!FLAGS.MULTI_USER) return null;

  const typingUsers = Array.from(users.values()).filter((u) => u.isTyping);
  if (typingUsers.length === 0) return null;

  let message: string;
  if (typingUsers.length === 1) {
    const u = typingUsers[0]!;
    const action = u.typingAction ?? 'editing';
    message = `${u.userName} is ${action}`;
  } else if (typingUsers.length === 2) {
    message = `${typingUsers[0]!.userName} and ${typingUsers[1]!.userName} are editing`;
  } else {
    message = `${typingUsers[0]!.userName} and ${typingUsers.length - 1} others are editing`;
  }

  return (
    <div className={css.indicator} role="status" aria-live="polite">
      <span className={css.text}>{message}</span>
      <span className={css.dots}>
        <span className={css.dot} />
        <span className={css.dot} />
        <span className={css.dot} />
      </span>
    </div>
  );
}
