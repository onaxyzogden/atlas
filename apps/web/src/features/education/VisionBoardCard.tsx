/**
 * §13 VisionBoardCard — steward attaches reference imagery per
 * entity-type slot (e.g. "what the orchard should look like in year 7",
 * "the workshop aesthetic"), stored as data-URI thumbnails in
 * localStorage. Pure client-side persistence — no backend upload.
 *
 * Renders as a gallery grouped by entity-type slot, with file-input
 * drop zone, per-image caption + slot tag, and a remove affordance.
 *
 * Closes manifest §13 `vision-board-media-reference-imagery`
 * (P3) planned -> done.
 */

import { useEffect, useRef, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import css from './VisionBoardCard.module.css';

interface Props {
  project: LocalProject;
}

interface VisionImage {
  id: string;
  slot: string;
  caption: string;
  dataUri: string;
  /** Bytes — for the storage-budget readout. */
  size: number;
  /** ISO 8601 string. */
  createdAt: string;
}

const SLOT_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'overall_vision', label: 'Overall vision' },
  { key: 'residence', label: 'Residence' },
  { key: 'barn', label: 'Barn' },
  { key: 'greenhouse', label: 'Greenhouse' },
  { key: 'workshop', label: 'Workshop' },
  { key: 'orchard', label: 'Orchard' },
  { key: 'food_forest', label: 'Food forest' },
  { key: 'market_garden', label: 'Market garden' },
  { key: 'paddock', label: 'Paddock / silvopasture' },
  { key: 'water_feature', label: 'Pond / swale / water feature' },
  { key: 'gathering_space', label: 'Gathering space' },
  { key: 'entrance', label: 'Entrance / threshold' },
  { key: 'other', label: 'Other' },
];

const SLOT_LABEL: Record<string, string> = Object.fromEntries(
  SLOT_OPTIONS.map((s) => [s.key, s.label]),
);

const STORAGE_PREFIX = 'ogden-vision-board-';
/** ~3 MB total budget — base64 inflates ~1.37x; this caps to ~4.1 MB raw. */
const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
/** Per-image cap to keep a single drop from blowing the budget. */
const MAX_SINGLE_BYTES = 800 * 1024;

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

function readBoard(projectId: string): VisionImage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is VisionImage =>
        typeof x === 'object' &&
        x !== null &&
        typeof (x as VisionImage).id === 'string' &&
        typeof (x as VisionImage).dataUri === 'string',
    );
  } catch {
    return [];
  }
}

function writeBoard(projectId: string, images: VisionImage[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(images));
  } catch {
    /* quota exceeded — caller should have validated before write */
  }
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function fmtKb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function VisionBoardCard({ project }: Props) {
  const [images, setImages] = useState<VisionImage[]>(() => readBoard(project.id));
  const [activeSlot, setActiveSlot] = useState<string>('overall_vision');
  const [draftCaption, setDraftCaption] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cross-tab sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === storageKey(project.id)) {
        setImages(readBoard(project.id));
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [project.id]);

  const totalBytes = images.reduce((sum, img) => sum + img.size, 0);
  const grouped: Record<string, VisionImage[]> = {};
  for (const img of images) {
    const arr = grouped[img.slot] ?? [];
    arr.push(img);
    grouped[img.slot] = arr;
  }
  const usedSlots = SLOT_OPTIONS.filter((s) => grouped[s.key] && grouped[s.key]!.length > 0);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported.');
      return;
    }
    if (file.size > MAX_SINGLE_BYTES) {
      setError(
        `Image is ${fmtKb(file.size)} — single-image limit is ${fmtKb(MAX_SINGLE_BYTES)}. Resize before adding.`,
      );
      return;
    }
    if (totalBytes + file.size > MAX_TOTAL_BYTES) {
      setError(
        `Adding this image would exceed the ${fmtKb(MAX_TOTAL_BYTES)} board budget. Remove some images first.`,
      );
      return;
    }
    try {
      const dataUri = await fileToDataUri(file);
      if (!dataUri) {
        setError('Failed to read file.');
        return;
      }
      const newImage: VisionImage = {
        id: uid(),
        slot: activeSlot,
        caption: draftCaption.trim(),
        dataUri,
        size: file.size,
        createdAt: new Date().toISOString(),
      };
      const next = [...images, newImage];
      setImages(next);
      writeBoard(project.id, next);
      setDraftCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      setError('Failed to encode image.');
    }
  }

  function handleRemove(id: string) {
    const next = images.filter((img) => img.id !== id);
    setImages(next);
    writeBoard(project.id, next);
  }

  function handleClearAll() {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Remove every image from the vision board? This cannot be undone.')) return;
    setImages([]);
    writeBoard(project.id, []);
  }

  return (
    <section className={css.card} aria-label="Vision board">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Vision board &amp; reference imagery</h3>
          <p className={css.cardHint}>
            Attach reference images per slot &mdash; what the orchard
            should look like in year 7, the workshop aesthetic, the
            entrance threshold you have in mind. Stored locally in this
            browser; no upload, no sync.
          </p>
        </div>
        <span className={css.heuristicBadge}>UI PRESET</span>
      </header>

      <div className={css.controlRow}>
        <div className={css.controlGroup}>
          <label className={css.controlLabel} htmlFor="vision-slot">
            Slot
          </label>
          <select
            id="vision-slot"
            className={css.select}
            value={activeSlot}
            onChange={(e) => setActiveSlot(e.target.value)}
          >
            {SLOT_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className={`${css.controlGroup} ${css.captionGroup}`}>
          <label className={css.controlLabel} htmlFor="vision-caption">
            Caption (optional)
          </label>
          <input
            id="vision-caption"
            type="text"
            className={css.input}
            value={draftCaption}
            onChange={(e) => setDraftCaption(e.target.value)}
            placeholder="e.g. year-7 canopy closure"
            maxLength={120}
          />
        </div>
        <div className={css.controlGroup}>
          <label className={css.controlLabel} htmlFor="vision-file">
            Image
          </label>
          <input
            id="vision-file"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={css.fileInput}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </div>
      </div>

      {error && <div className={css.error}>{error}</div>}

      <div className={css.statusRow}>
        <div className={css.statusItem}>
          <div className={css.statusValue}>{images.length}</div>
          <div className={css.statusLabel}>Images</div>
        </div>
        <div className={css.statusItem}>
          <div className={css.statusValue}>{usedSlots.length}</div>
          <div className={css.statusLabel}>Slots used</div>
        </div>
        <div className={css.statusItem}>
          <div className={css.statusValue}>{fmtKb(totalBytes)}</div>
          <div className={css.statusLabel}>
            of {fmtKb(MAX_TOTAL_BYTES)}
          </div>
        </div>
        <button
          type="button"
          className={css.clearBtn}
          onClick={handleClearAll}
          disabled={images.length === 0}
        >
          Clear board
        </button>
      </div>

      {images.length === 0 ? (
        <div className={css.empty}>
          No images yet. Pick a slot, add an optional caption, and choose
          a file to start the vision board for this project.
        </div>
      ) : (
        usedSlots.map((slot) => (
          <div key={slot.key} className={css.slotBlock}>
            <h4 className={css.slotTitle}>
              {slot.label}{' '}
              <span className={css.slotCount}>
                ({grouped[slot.key]?.length ?? 0})
              </span>
            </h4>
            <div className={css.gallery}>
              {(grouped[slot.key] ?? []).map((img) => (
                <figure key={img.id} className={css.tile}>
                  <img
                    src={img.dataUri}
                    alt={img.caption || SLOT_LABEL[img.slot] || 'reference'}
                    className={css.thumb}
                  />
                  <figcaption className={css.tileCaption}>
                    {img.caption || (
                      <span className={css.captionPlaceholder}>(no caption)</span>
                    )}
                    <div className={css.tileMeta}>
                      {fmtKb(img.size)} &middot;{' '}
                      {new Date(img.createdAt).toLocaleDateString()}
                    </div>
                  </figcaption>
                  <button
                    type="button"
                    className={css.removeBtn}
                    onClick={() => handleRemove(img.id)}
                    aria-label="Remove image"
                  >
                    &times;
                  </button>
                </figure>
              ))}
            </div>
          </div>
        ))
      )}

      <p className={css.footnote}>
        <em>How storage works:</em> images are read into base64 data URIs
        and saved to this browser&rsquo;s localStorage under{' '}
        <code>{storageKey(project.id)}</code>. Capped at{' '}
        {fmtKb(MAX_TOTAL_BYTES)} total / {fmtKb(MAX_SINGLE_BYTES)} per
        image. Clearing browser data wipes the board &mdash; export images
        elsewhere if you need long-term archive.
      </p>
    </section>
  );
}
