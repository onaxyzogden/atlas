/**
 * HeaderStageSearch — the global header search input for the active working
 * stage (Observe / Plan / Act).
 *
 * Renders only on a recognised stage route (useActiveStageRoute). The query is
 * pushed — debounced — into the ephemeral stageSearchStore, which the active
 * stage surface reads to broaden its scoped list into a cross-scope match list
 * (objectives + tools + domains). The query is cleared whenever the steward
 * switches stages so a Plan search never leaks into Act.
 */

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../components/ui/Input.js';
import { useStageSearchStore } from '../store/stageSearchStore.js';
import {
  useActiveStageRoute,
  type SearchableStage,
} from './useActiveStageRoute.js';
import css from './HeaderStageSearch.module.css';

const PLACEHOLDER: Record<SearchableStage, string> = {
  observe: 'Search modules, domains…',
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

  // Push the local value into the store, debounced, so heavy match resolvers
  // downstream don't thrash on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(value), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, setQuery]);

  // Pull external resets (a surface clears the store after a match is
  // selected) back into the local input so the two never drift.
  useEffect(() => {
    if (query === '' && value !== '') setValue('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Clear on stage change — the query is scoped to one stage at a time.
  useEffect(() => {
    setValue('');
    clear();
  }, [stage, clear]);

  if (!stage) return null;

  return (
    <div className={css.root}>
      <Input
        size="sm"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={PLACEHOLDER[stage]}
        aria-label={`Search the ${stage} stage`}
        iconLeft={<Search size={14} aria-hidden="true" />}
        className={css.input}
      />
    </div>
  );
}
