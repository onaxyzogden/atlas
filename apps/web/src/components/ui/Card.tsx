import React, { forwardRef, createContext, useContext } from 'react';
import styles from './Card.module.css';

/* -------------------------------------------------------------------------- */
/*  Card — OGDEN Atlas Design System (Compound Component)                     */
/* -------------------------------------------------------------------------- */

type CardVariant = 'default' | 'outlined' | 'elevated';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardContextValue {
  padding: CardPadding;
}

const CardContext = createContext<CardContextValue>({ padding: 'md' });

/* --- Card (root) ---------------------------------------------------------- */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
}

const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      interactive = false,
      className,
      onClick,
      children,
      ...rest
    },
    ref,
  ) => {
    const classNames = [
      styles.card,
      styles[`variant-${variant}`],
      interactive ? styles.interactive : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <CardContext.Provider value={{ padding }}>
        <div
          ref={ref}
          className={classNames}
          onClick={onClick}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          onKeyDown={
            interactive
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
                  }
                }
              : undefined
          }
          {...rest}
        >
          {children}
        </div>
      </CardContext.Provider>
    );
  },
);

CardRoot.displayName = 'Card';

/* --- Card.Header ---------------------------------------------------------- */

export interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, ...rest }, ref) => {
    const { padding } = useContext(CardContext);

    const classNames = [
      styles.header,
      styles[`padding-${padding}`],
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classNames} {...rest}>
        {children}
      </div>
    );
  },
);

CardHeader.displayName = 'Card.Header';

/* --- Card.Body ------------------------------------------------------------ */

const CardBody = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, ...rest }, ref) => {
    const { padding } = useContext(CardContext);

    const classNames = [
      styles.body,
      styles[`padding-${padding}`],
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classNames} {...rest}>
        {children}
      </div>
    );
  },
);

CardBody.displayName = 'Card.Body';

/* --- Card.Footer ---------------------------------------------------------- */

const CardFooter = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, ...rest }, ref) => {
    const { padding } = useContext(CardContext);

    const classNames = [
      styles.footer,
      styles[`padding-${padding}`],
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classNames} {...rest}>
        {children}
      </div>
    );
  },
);

CardFooter.displayName = 'Card.Footer';

/* --- Compound export ------------------------------------------------------ */

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});
