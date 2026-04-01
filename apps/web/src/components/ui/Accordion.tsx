import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
  useId,
} from 'react';
import styles from './Accordion.module.css';

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface AccordionContextValue {
  expandedValues: string[];
  toggle: (value: string) => void;
  baseId: string;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error(
      'Accordion compound components must be used within <Accordion>',
    );
  }
  return ctx;
}

interface AccordionItemContextValue {
  value: string;
  isOpen: boolean;
  disabled: boolean;
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(
  null,
);

function useAccordionItemContext() {
  const ctx = useContext(AccordionItemContext);
  if (!ctx) {
    throw new Error(
      'Accordion.Trigger / Accordion.Content must be used within <Accordion.Item>',
    );
  }
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*  Accordion (root)                                                          */
/* -------------------------------------------------------------------------- */

export interface AccordionSingleProps {
  type: 'single';
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export interface AccordionMultipleProps {
  type: 'multiple';
  value?: string[];
  onChange?: (value: string[]) => void;
  children: React.ReactNode;
  className?: string;
}

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

export function Accordion(props: AccordionProps) {
  const { type, children, className } = props;
  const baseId = useId();

  /* Normalise value into string[] regardless of type */
  const expandedValues: string[] =
    type === 'single'
      ? props.value
        ? [props.value]
        : []
      : props.value ?? [];

  const toggle = useCallback(
    (itemValue: string) => {
      if (type === 'single') {
        const singleProps = props as AccordionSingleProps;
        const next =
          singleProps.value === itemValue ? '' : itemValue;
        singleProps.onChange?.(next);
      } else {
        const multiProps = props as AccordionMultipleProps;
        const current = multiProps.value ?? [];
        const next = current.includes(itemValue)
          ? current.filter((v) => v !== itemValue)
          : [...current, itemValue];
        multiProps.onChange?.(next);
      }
    },
    [type, props],
  );

  return (
    <AccordionContext.Provider value={{ expandedValues, toggle, baseId }}>
      <div className={`${styles.root} ${className ?? ''}`}>{children}</div>
    </AccordionContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Accordion.Item                                                            */
/* -------------------------------------------------------------------------- */

export interface AccordionItemProps {
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

function AccordionItem({
  value,
  disabled = false,
  children,
  className,
}: AccordionItemProps) {
  const { expandedValues } = useAccordionContext();
  const isOpen = expandedValues.includes(value);

  return (
    <AccordionItemContext.Provider value={{ value, isOpen, disabled }}>
      <div
        className={`${styles.item} ${className ?? ''}`}
        data-state={isOpen ? 'open' : 'closed'}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Accordion.Trigger                                                         */
/* -------------------------------------------------------------------------- */

export interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

function AccordionTrigger({ children, className }: AccordionTriggerProps) {
  const { toggle, baseId } = useAccordionContext();
  const { value, isOpen, disabled } = useAccordionItemContext();

  const triggerId = `${baseId}-trigger-${value}`;
  const contentId = `${baseId}-content-${value}`;

  const triggerClasses = [
    styles.trigger,
    isOpen ? styles.triggerOpen : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <h3 className={styles.triggerHeading}>
      <button
        type="button"
        id={triggerId}
        className={triggerClasses}
        aria-expanded={isOpen}
        aria-controls={contentId}
        disabled={disabled}
        onClick={() => toggle(value)}
      >
        <span className={styles.triggerLabel}>{children}</span>
        <svg
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </h3>
  );
}

/* -------------------------------------------------------------------------- */
/*  Accordion.Content                                                         */
/* -------------------------------------------------------------------------- */

export interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

function AccordionContent({ children, className }: AccordionContentProps) {
  const { baseId } = useAccordionContext();
  const { value, isOpen } = useAccordionItemContext();
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<string>(isOpen ? 'none' : '0px');

  const triggerId = `${baseId}-trigger-${value}`;
  const contentId = `${baseId}-content-${value}`;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    if (isOpen) {
      /* Expand: measure scroll height, set it, then switch to "none" after
         transition so content that changes height isn't clipped. */
      setMaxHeight(`${el.scrollHeight}px`);
      const timer = setTimeout(() => setMaxHeight('none'), 250);
      return () => clearTimeout(timer);
    } else {
      /* Collapse: first pin to current height (so transition starts from it),
         then on next frame set to 0. */
      setMaxHeight(`${el.scrollHeight}px`);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMaxHeight('0px');
        });
      });
    }
  }, [isOpen]);

  const contentClasses = [
    styles.content,
    isOpen ? styles.contentOpen : styles.contentClosed,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={contentRef}
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      className={contentClasses}
      style={{ maxHeight }}
      hidden={!isOpen && maxHeight === '0px'}
    >
      <div className={styles.contentInner}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Attach sub-components                                                     */
/* -------------------------------------------------------------------------- */

Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;

Accordion.displayName = 'Accordion';
