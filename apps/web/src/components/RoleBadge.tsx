/**
 * RoleBadge — compact visual indicator of a user's project role.
 * Uses design system colors: Owner=gold, Designer=green, Reviewer=blue-gray, Viewer=muted.
 */

import type { ProjectRole } from '@ogden/shared';

interface RoleBadgeProps {
  role: ProjectRole | null;
  size?: 'sm' | 'md';
}

const ROLE_STYLES: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  owner:    { icon: '\u{1F451}', color: '#CA8A04', bg: 'rgba(202,138,4,0.12)',  label: 'Owner' },
  designer: { icon: '\u270F\uFE0F',  color: '#15803D', bg: 'rgba(21,128,61,0.12)', label: 'Designer' },
  reviewer: { icon: '\u{1F4AC}', color: '#7a8a9a', bg: 'rgba(122,138,154,0.12)', label: 'Reviewer' },
  viewer:   { icon: '\u{1F441}\uFE0F',  color: '#9a8a7a', bg: 'rgba(154,138,122,0.12)', label: 'Viewer' },
};

export default function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  if (!role) return null;
  const s = ROLE_STYLES[role] ?? ROLE_STYLES.viewer!;
  const isSm = size === 'sm';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: isSm ? 3 : 5,
      padding: isSm ? '2px 8px' : '3px 10px',
      borderRadius: 4,
      background: s.bg, color: s.color,
      fontSize: isSm ? 10 : 12,
      fontWeight: 600,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: isSm ? 11 : 14 }}>{s.icon}</span>
      {s.label}
    </span>
  );
}
