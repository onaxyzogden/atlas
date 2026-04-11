/**
 * PresenceBar — shows avatar initials for users connected to the project.
 *
 * Rendered in the ProjectTabBar .right section. Gated behind MULTI_USER flag.
 * Shows max 5 avatars + overflow count.
 */

import { FLAGS } from '@ogden/shared';
import { usePresenceStore, type PresenceUser } from '../store/presenceStore.js';
import css from './PresenceBar.module.css';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#5a7c5e', // sage
  '#7c6a5a', // earth
  '#5a6e7c', // slate
  '#7c5a6e', // mauve
  '#6e7c5a', // olive
  '#5a7c72', // teal
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

const MAX_VISIBLE = 5;

export default function PresenceBar() {
  const users = usePresenceStore((s) => s.users);

  if (!FLAGS.MULTI_USER) return null;

  const userList = Array.from(users.values());
  if (userList.length === 0) return null;

  const visible = userList.slice(0, MAX_VISIBLE);
  const overflow = userList.length - MAX_VISIBLE;

  return (
    <div className={css.bar} aria-label="Connected users">
      {visible.map((user) => (
        <UserAvatar key={user.userId} user={user} />
      ))}
      {overflow > 0 && (
        <div className={css.overflow}>+{overflow}</div>
      )}
    </div>
  );
}

function UserAvatar({ user }: { user: PresenceUser }) {
  const isActive = Date.now() - user.lastSeen < 10_000;
  const bg = colorForUser(user.userId);

  return (
    <div
      className={css.avatar}
      style={{ backgroundColor: bg }}
      title={`${user.userName}${user.isTyping ? ` (${user.typingAction ?? 'editing'})` : ''}`}
    >
      <span className={css.initials}>{getInitials(user.userName)}</span>
      {isActive && <span className={css.pulse} />}
    </div>
  );
}
