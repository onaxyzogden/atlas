import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useId,
} from 'react';
import styles from './Tabs.module.css';

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface TabsContextValue {
  activeValue: string;
  onChange: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs compound components must be used within <Tabs>');
  }
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*  Tabs (root)                                                               */
/* -------------------------------------------------------------------------- */

export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onChange, children, className }: TabsProps) {
  const baseId = useId();

  return (
    <TabsContext.Provider value={{ activeValue: value, onChange, baseId }}>
      <div className={`${styles.root} ${className ?? ''}`}>{children}</div>
    </TabsContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tabs.List                                                                 */
/* -------------------------------------------------------------------------- */

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

function TabsList({ children, className }: TabsListProps) {
  const { onChange } = useTabsContext();
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const list = listRef.current;
      if (!list) return;

      const tabs = Array.from(
        list.querySelectorAll<HTMLButtonElement>(
          `button[role="tab"]:not(:disabled)`,
        ),
      );
      const current = document.activeElement as HTMLButtonElement;
      const idx = tabs.indexOf(current);
      if (idx === -1) return;

      let next: HTMLButtonElement | undefined;

      if (e.key === 'ArrowRight') {
        next = tabs[(idx + 1) % tabs.length];
      } else if (e.key === 'ArrowLeft') {
        next = tabs[(idx - 1 + tabs.length) % tabs.length];
      } else if (e.key === 'Home') {
        next = tabs[0];
      } else if (e.key === 'End') {
        next = tabs[tabs.length - 1];
      }

      if (next) {
        e.preventDefault();
        next.focus();
        const tabValue = next.dataset.tabValue;
        if (tabValue) onChange(tabValue);
      }
    },
    [onChange],
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      className={`${styles.list} ${className ?? ''}`}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tabs.Tab                                                                  */
/* -------------------------------------------------------------------------- */

export interface TabsTabProps {
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

function TabsTab({ value, disabled = false, children, className }: TabsTabProps) {
  const { activeValue, onChange, baseId } = useTabsContext();
  const isActive = activeValue === value;

  const classNames = [
    styles.tab,
    isActive ? styles.tabActive : styles.tabInactive,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      role="tab"
      type="button"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      data-tab-value={value}
      className={classNames}
      onClick={() => onChange(value)}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tabs.Panel                                                                */
/* -------------------------------------------------------------------------- */

export interface TabsPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

function TabsPanel({ value, children, className }: TabsPanelProps) {
  const { activeValue, baseId } = useTabsContext();
  if (activeValue !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={`${styles.panel} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Attach sub-components                                                     */
/* -------------------------------------------------------------------------- */

Tabs.List = TabsList;
Tabs.Tab = TabsTab;
Tabs.Panel = TabsPanel;

Tabs.displayName = 'Tabs';
