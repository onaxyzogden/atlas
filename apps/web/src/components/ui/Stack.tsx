import React from 'react';
import styles from './Stack.module.css';

/* -------------------------------------------------------------------------- */
/*  Stack — OGDEN Atlas Design System                                         */
/* -------------------------------------------------------------------------- */

type StackDirection = 'row' | 'column';
type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around';
type StackGap = 1 | 2 | 3 | 4 | 6 | 8;

export interface StackProps {
  direction?: StackDirection;
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
}

export const Stack: React.FC<StackProps> = ({
  direction = 'column',
  gap,
  align,
  justify,
  wrap = false,
  as: Tag = 'div',
  className,
  children,
}) => {
  const classNames = [
    styles.stack,
    styles[direction],
    gap != null ? styles[`gap-${gap}`] : '',
    align ? styles[`align-${align}`] : '',
    justify ? styles[`justify-${justify}`] : '',
    wrap ? styles.wrap : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classNames}>{children}</Tag>;
};

Stack.displayName = 'Stack';
