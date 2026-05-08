/**
 * MoodboardUploader — file picker → base64 data URLs → visionStore.
 *
 * Renders a thumbnail grid with × buttons. No external deps. Resizes
 * source images to a max dimension of 1200px so localStorage doesn't fill
 * up with full-resolution camera dumps.
 */

import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import type { MoodboardImage } from '../../../../store/visionStore.js';

interface MoodboardUploaderProps {
  images: MoodboardImage[];
  onAdd: (image: MoodboardImage) => void;
  onRemove: (id: string) => void;
  maxDim?: number;
}

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB pre-resize cap

function makeId(): string {
  return `mb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readAndResize(file: File, maxDim: number): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image decode failed'));
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale === 1) return dataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function MoodboardUploader({
  images,
  onAdd,
  onRemove,
  maxDim = 1200,
}: MoodboardUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      try {
        const dataUrl = await readAndResize(file, maxDim);
        onAdd({ id: makeId(), dataUrl, caption: file.name });
      } catch {
        // skip unreadable files silently
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="moodboard-uploader">
      <div className="moodboard-grid">
        {images.map((image) => (
          <figure key={image.id} className="moodboard-tile">
            <img src={image.dataUrl} alt={image.caption ?? 'Moodboard image'} />
            <button
              type="button"
              className="moodboard-remove"
              aria-label={`Remove ${image.caption ?? 'image'}`}
              onClick={() => onRemove(image.id)}
            >
              <X aria-hidden="true" />
            </button>
          </figure>
        ))}
        <button
          type="button"
          className="moodboard-add"
          onClick={() => inputRef.current?.click()}
        >
          <Plus aria-hidden="true" />
          <span>Add images</span>
        </button>
      </div>
      {images.length === 0 ? (
        <p className="moodboard-empty">
          No moodboard images yet — click "Add images" to upload references.
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
