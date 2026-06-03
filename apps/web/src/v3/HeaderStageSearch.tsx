/**
 * HeaderStageSearch — the global header search input for the active working
 * stage (Observe / Plan / Act).
 *
 * Renders only on a recognised stage route (useActiveStageRoute). To keep the
 * header chrome quiet, it shows as a single Search ICON button by default and
 * expands into the full input on click (auto-focused). It collapses back to the
 * icon on blur when the field is empty; while a query is active it stays
 * expanded so the steward can see and clear the live filter.
 *
 * The query is pushed — debounced — into the ephemeral stageSearchStore, which
 * the active stage surface reads to broaden its scoped list into a cross-scope
 * match list (objectives + tools + domains). The query is cleared whenever the
 * steward switches stages so a Plan search never leaks into Act.
 */

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../components/ui/Input.js';
import { useStageSearchStore } from '../store/stageSearchStore.js';
import {
  useActiveStageRoute,
  type SearchableStage,
} from './useActiveStageRoute.js';
import css from './HeaderStageSearch.module.css';

const PLACEHOLDER: Record<SearchableStage, string> = {
  observe: 'Search domains…',
  plan: 'Search objectives, domains…',
  act: 'Search tools, objectives…',
};

const DEBOUNCE_MS = 150;

export default function HeaderStageSearch() {
  const active = useActiveStageRoute();
  const stage = active?.stage ?? null;

  const query = useStageSearchStore((s) => s.query);
  const setQuery = useStageSearchStore((s) => s.setQuery);
  const clear = useStageSearchStore((s) => s.clear);

  const [value, setValue] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Push the local value into the store, debounced, so heavy match resolvers
  // downstream don't thrash on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(value), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, setQuery]);

  // Pull external resets (a surface clears the store after a match is
  // selected) back into the local input so the two never drift. An external
  // clear also collapses the field back to the icon.
  useEffect(() => {
    if (query === '' && value !== '') setValue('');
    if (query === '') setExpanded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Clear + collapse on stage change — the query is scoped to one stage at a
  // time, and the icon is the resting state on every fresh stage.
  useEffect(() => {
    setValue('');
    setExpanded(false);
    clear();
  }, [stage, clear]);

  // Focus the input the moment it expands so the steward can type immediately.
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  if (!stage) return null;

  // Collapsed resting state: a single icon button. Expands on click.
  if (!expanded) {
    return (
      <div className={css.root} data-collapsed="true">
        <button
          type="button"
          className={css.iconButton}
          aria-label={`Search the ${stage} stage`}
          aria-expanded={false}
          onClick={() => setExpanded(true)}
        >
          <Search size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className={css.root}>
      <Input
        ref={inputRef}
        size="sm"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          // Collapse back to the icon only when nothing is being searched;
          // keep an active filter visible so it stays discoverable + clearable.
          if (value.trim() === '') setExpanded(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setValue('');
            clear();
            setExpanded(false);
          }
        }}
        placeholder={PLACEHOLDER[stage]}
        aria-label={`Search the ${stage} stage`}
        iconLeft={<Search size={14} aria-hidden="true" />}
        className={css.input}
      />
    </div>
  );
}
