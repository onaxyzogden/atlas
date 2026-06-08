import * as React from 'react';
import styles from './InterpretationBlock.module.css';

export type InterpretationTone = 'pass' | 'warn' | 'info' | 'fail';

export interface InterpretationBlockProps {
  tone: InterpretationTone;
  children: React.ReactNode;
  className?: string;
}

/**
 * InterpretationBlock -- a pass/warn/info/fail colored note fed by a computed
 * value. Tone drives the tint via a data-tone attribute.
 */
export function InterpretationBlock({
  tone,
  children,
  className,
}: InterpretationBlockProps): React.JSX.Element {
  const cls = className ? `${styles.block} ${className}` : styles.block;
  return (
    <div className={cls} data-tone={tone} role="note">
      {children}
    </div>
  );
}
