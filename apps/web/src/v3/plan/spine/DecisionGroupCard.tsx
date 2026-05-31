// DecisionGroupCard.tsx — the prototype's read-only decision-group card
// (formerly "ProtocolCard"), transcribed VERBATIM from olos_plan_spine.jsx.
// Read-only, expandable item previews, "Open in Act →" CTA. A decision group is
// a named scope within an objective that partitions its Act checklist items and
// feeds an Observe domain — matching the live `decisionGroups` schema. (Renamed
// from "protocol" so "Protocol" refers only to the spec's conditional rules.)

import { useState } from 'react';
import { C, F, CA } from './tokens.js';
import type { SpineDecisionGroup } from './types.js';

export default function DecisionGroupCard({
  group,
  index,
  isPatched,
}: {
  group: SpineDecisionGroup;
  index: number;
  isPatched: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDone = group.done;
  const hasItems = !!group.items && group.items.length > 0;
  const accentColor = isPatched ? C.amber : isDone ? C.green : C.blue;
  const bgColor = isPatched ? C.amberDim : isDone ? C.greenDim : C.blueDim;
  const borderColor = isPatched ? CA('amber', 0.33) : isDone ? CA('green', 0.27) : C.border;

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${borderColor}`, marginBottom: 8 }}>
      {/* Group header — tappable if has items */}
      <div
        onClick={() => hasItems && setExpanded((p) => !p)}
        style={{
          background: bgColor,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: expanded ? `1px solid ${borderColor}` : 'none',
          cursor: hasItems ? 'pointer' : 'default',
          transition: 'opacity 0.15s',
        }}
      >
        {/* Number bubble */}
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: isDone ? C.green : isPatched ? C.amber : C.blue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: isDone ? C.greenDim : isPatched ? C.amberDim : C.blueDim,
              fontFamily: F.mono,
            }}
          >
            {isDone ? '✓' : index + 1}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: F.sans,
              letterSpacing: '0.01em',
              color: isDone ? C.textSecondary : C.textPrimary,
              textDecoration: isDone ? 'line-through' : 'none',
            }}
          >
            {group.label}
          </div>
        </div>
        {isPatched && (
          <span
            style={{
              fontSize: 9,
              color: C.amber,
              fontFamily: F.sans,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            Added
          </span>
        )}
        {hasItems && (
          <span style={{ fontSize: 10, color: accentColor, opacity: 0.7, flexShrink: 0, fontFamily: F.sans }}>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* Expanded items — read-only preview, Act-only */}
      {expanded && hasItems && (
        <div style={{ background: C.bg }}>
          {/* Act-only banner */}
          <div
            style={{
              padding: '6px 14px',
              background: C.bg3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: 9, color: C.textTertiary, fontFamily: F.sans, fontStyle: 'italic' }}>
              ⌒ Read-only preview — decisions are worked through in Act
            </span>
          </div>
          {/* Items */}
          {group.items!.map((item, i) => (
            <div
              key={i}
              style={{
                padding: '9px 14px 9px 38px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                borderBottom: i < group.items!.length - 1 ? `1px solid ${CA('border', 0.2)}` : 'none',
                background: i % 2 === 0 ? C.bg : C.bg2,
              }}
            >
              {/* Non-interactive checkbox */}
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  flexShrink: 0,
                  marginTop: 2,
                  border: `1.5px solid ${isDone ? C.green : C.textTertiary}`,
                  background: isDone ? C.green : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.7,
                }}
              >
                {isDone && <span style={{ fontSize: 9, color: C.greenDim, fontFamily: F.sans }}>✓</span>}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: isDone ? C.textTertiary : C.textSecondary,
                  fontFamily: F.sans,
                  lineHeight: 1.5,
                  textDecoration: isDone ? 'line-through' : 'none',
                }}
              >
                {item}
              </span>
            </div>
          ))}
          {/* Act CTA on expanded */}
          <div
            style={{
              padding: '10px 14px',
              background: C.bg3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans, fontStyle: 'italic' }}>
              Full methodology available in Act
            </span>
            <span style={{ fontSize: 10, color: C.blue, fontFamily: F.sans, fontWeight: 600 }}>
              Open in Act →
            </span>
          </div>
        </div>
      )}

      {/* Group meta footer */}
      {!expanded && (
        <div
          style={{
            background: C.bg3,
            padding: '7px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 10, color: C.teal, fontFamily: F.sans }}>→ feeds {group.feeds}</span>
          <span
            style={{
              fontSize: 10,
              color: C.textTertiary,
              fontFamily: F.mono,
              background: C.bg4,
              borderRadius: 8,
              padding: '1px 7px',
            }}
          >
            {group.count} item{group.count !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
