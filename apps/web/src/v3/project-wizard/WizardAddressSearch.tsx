/**
 * WizardAddressSearch - "find your property by address" overlay for the
 * Step 1 creation map. Debounced MapTiler forward-geocode (same REST
 * pattern as the legacy StepBoundary), scoped by the wizard's selected
 * country. Selecting a result flies the map there and drops a single
 * temporary marker; the steward still draws/confirms the boundary by hand.
 *
 * No parcel-boundary auto-fetch (that needs a cadastral provider) - this
 * is purely a locate-and-pin aid.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Country } from '@ogden/shared';
import {
  maplibregl,
  hasMapToken,
  maptilerKey,
} from '../../lib/maplibre.js';
import { Input } from '../../components/ui/Input.js';
import styles from './WizardAddressSearch.module.css';

interface GeocodeResult {
  id: string;
  placeName: string;
  center: [number, number]; // [lng, lat]
}

interface WizardAddressSearchProps {
  map: maplibregl.Map;
  country: Country;
  /** Notified with [lng, lat] when the user picks a result. */
  onLocated?: (center: [number, number]) => void;
}

const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 5;
const RESULT_ZOOM = 16;

export default function WizardAddressSearch({
  map,
  country,
  onLocated,
}: WizardAddressSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markerRef = useRef<maplibregl.Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Clean up marker + pending work on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);

  const runSearch = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q || !hasMapToken) {
        setResults([]);
        setOpen(false);
        return;
      }
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams({
        key: maptilerKey ?? '',
        limit: String(RESULT_LIMIT),
        autocomplete: 'true',
      });
      if (country === 'US') params.set('country', 'us');
      else if (country === 'CA') params.set('country', 'ca');

      setLoading(true);
      setError(null);
      fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?${params.toString()}`,
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then((data) => {
          const features = Array.isArray(data?.features) ? data.features : [];
          const mapped: GeocodeResult[] = features
            .filter((f: { center?: unknown }) => Array.isArray(f.center))
            .map((f: { id?: string; place_name?: string; text?: string; center: [number, number] }, i: number) => ({
              id: f.id ?? String(i),
              placeName: f.place_name ?? f.text ?? 'Unknown location',
              center: f.center,
            }));
          setResults(mapped);
          setOpen(true);
          setLoading(false);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          console.warn('[wizard] address geocode failed', err);
          setError('Address lookup failed. Try again.');
          setResults([]);
          setLoading(false);
        });
    },
    [country],
  );

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(value), DEBOUNCE_MS);
  };

  const handleSelect = (result: GeocodeResult) => {
    setQuery(result.placeName);
    setOpen(false);
    setResults([]);
    map.flyTo({ center: result.center, zoom: RESULT_ZOOM, duration: 1200 });
    if (markerRef.current) {
      markerRef.current.setLngLat(result.center);
    } else {
      markerRef.current = new maplibregl.Marker({ color: '#c4a265' })
        .setLngLat(result.center)
        .addTo(map);
    }
    onLocated?.(result.center);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    setError(null);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  if (!hasMapToken) {
    return (
      <div className={styles.wrap}>
        <div className={styles.hint}>
          Add a MapTiler key to search by address.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <Input
        size="sm"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Find your property by address"
        aria-label="Find your property by address"
        iconLeft={<Search size={15} aria-hidden />}
        iconRight={
          query ? (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
              aria-label="Clear address search"
            >
              <X size={14} aria-hidden />
            </button>
          ) : undefined
        }
      />
      {error && <div className={styles.error}>{error}</div>}
      {open && results.length > 0 && (
        <ul className={styles.results} role="listbox" aria-label="Address results">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={styles.result}
                role="option"
                aria-selected="false"
                onClick={() => handleSelect(r)}
              >
                {r.placeName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && results.length === 0 && query.trim() && !error && (
        <div className={styles.empty}>No matches found.</div>
      )}
    </div>
  );
}
