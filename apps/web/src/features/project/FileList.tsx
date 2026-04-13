/**
 * FileList — displays uploaded project files with type icons, processing status,
 * extracted data previews, and confidence badges.
 * Fetches from the API when authenticated, falls back to local attachments.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ProjectFile, ConfidenceLevel } from '@ogden/shared';
import type { ProjectAttachment } from '../../store/projectStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { api } from '../../lib/apiClient.js';
import ConfidenceIndicator from '../assessment/ConfidenceIndicator.js';
import { confidence } from '../../lib/tokens.js';

interface FileListProps {
  projectId: string;
  serverId?: string;
  localAttachments: ProjectAttachment[];
}

interface ServerFile extends ProjectFile {
  confidence?: ConfidenceLevel;
}

const TYPE_ICONS: Record<string, string> = {
  kml: '\u{1F5FA}\uFE0F',       // map
  kmz: '\u{1F5FA}\uFE0F',
  geojson: '\u{1F5FA}\uFE0F',
  shapefile: '\u{1F5FA}\uFE0F',
  geotiff: '\u{1F5FA}\uFE0F',
  photo: '\u{1F4F7}',           // camera
  soil_test: '\u{1F9EA}',       // test tube
  document: '\u{1F4C4}',        // document
};

export default function FileList({ projectId, serverId, localAttachments }: FileListProps) {
  const { token } = useAuthStore();
  const [serverFiles, setServerFiles] = useState<ServerFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!token || !serverId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.files.list(serverId);
      setServerFiles(res.data as ServerFile[]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, serverId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = async (fileId: string) => {
    if (!serverId) return;
    try {
      await api.files.delete(serverId, fileId);
      setServerFiles((prev) => prev?.filter((f) => f.id !== fileId) ?? null);
    } catch {
      // Silent failure — file may already be deleted
    }
  };

  // Use server files when available, otherwise show local attachments
  const useServer = serverFiles != null && serverFiles.length > 0;
  const totalCount = useServer ? serverFiles.length : localAttachments.length;

  if (totalCount === 0 && !loading) return null;

  return (
    <div>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--color-text-muted)',
        marginBottom: 8,
      }}>
        Files ({totalCount})
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>
          Loading files...
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: confidence.low, padding: '4px 0' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {useServer
          ? serverFiles.map((file) => (
            <ServerFileRow key={file.id} file={file} onDelete={() => handleDelete(file.id)} />
          ))
          : localAttachments.map((att) => (
            <LocalFileRow key={att.id} attachment={att} />
          ))
        }
      </div>
    </div>
  );
}

// ─── Server File Row (with extracted data + confidence) ─────────────────────

function ServerFileRow({ file, onDelete }: { file: ServerFile; onDelete: () => void }) {
  const icon = TYPE_ICONS[file.fileType] ?? '\u{1F4C4}';
  const extracted = getExtractedSummary(file);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '8px 10px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <span>{icon}</span>
        <span style={{ flex: 1, color: 'var(--color-text)', fontWeight: 500 }}>
          {file.filename}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
          {formatFileSize(file.fileSizeBytes)}
        </span>
        <StatusBadge status={file.processingStatus} />
        <button
          onClick={onDelete}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 4px',
          }}
          title="Remove file"
        >
          \u00D7
        </button>
      </div>

      {/* Extracted data preview */}
      {extracted && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 24 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {extracted.summary}
          </span>
          {file.confidence && (
            <ConfidenceIndicator confidence={file.confidence as ConfidenceLevel} compact />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Local File Row (simple display, no parsed data) ────────────────────────

function LocalFileRow({ attachment }: { attachment: ProjectAttachment }) {
  const icon = TYPE_ICONS[attachment.type] ?? '\u{1F4C4}';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      fontSize: 12,
    }}>
      <span>{icon}</span>
      <span style={{ flex: 1, color: 'var(--color-text)' }}>{attachment.filename}</span>
      <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
        {formatFileSize(attachment.size)}
      </span>
      <span style={{
        fontSize: 10,
        color: 'var(--color-text-muted)',
        fontStyle: 'italic',
      }}>
        local
      </span>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    complete: { bg: '#dcfce7', color: '#166534', label: 'processed' },
    pending: { bg: '#fef9c3', color: '#854d0e', label: 'pending' },
    processing: { bg: '#dbeafe', color: '#1e40af', label: 'processing' },
    failed: { bg: '#fecaca', color: '#991b1b', label: 'failed' },
  };
  const s = styles[status] ?? styles.pending!;

  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      padding: '1px 6px',
      borderRadius: 10,
      background: s.bg,
      color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getExtractedSummary(file: ServerFile): { summary: string } | null {
  // Geo files: show feature count and geometry types
  if (file.processedGeojson && typeof file.processedGeojson === 'object') {
    const geo = file.processedGeojson as Record<string, unknown>;
    const count = geo.featureCount as number | undefined;
    const types = (geo.geometryTypes as string[]) ?? [];
    if (count != null) {
      return {
        summary: `${count} feature${count !== 1 ? 's' : ''} (${types.join(', ') || 'unknown type'})`,
      };
    }
  }

  // Photos: show geotag
  if (file.metadata && typeof file.metadata === 'object') {
    const meta = file.metadata as Record<string, unknown>;

    if (meta.exif && typeof meta.exif === 'object') {
      const exif = meta.exif as Record<string, unknown>;
      if (exif.lat != null && exif.lng != null) {
        const lat = (exif.lat as number).toFixed(4);
        const lng = (exif.lng as number).toFixed(4);
        const camera = exif.camera ? ` \u00B7 ${exif.camera}` : '';
        return { summary: `Geotag: ${lat}, ${lng}${camera}` };
      }
    }

    // Soil tests: show key values
    if (meta.soilTest && typeof meta.soilTest === 'object') {
      const soil = meta.soilTest as Record<string, unknown>;
      const parts: string[] = [];
      if (soil.ph != null) parts.push(`pH ${soil.ph}`);
      if (soil.organicMatter != null) parts.push(`OM ${soil.organicMatter}%`);
      if (soil.texture) parts.push(String(soil.texture));
      if (parts.length > 0) {
        return { summary: parts.join(' \u00B7 ') };
      }
    }
  }

  if (file.processingStatus === 'failed' && file.metadata) {
    const meta = file.metadata as Record<string, unknown>;
    if (meta.error) {
      return { summary: `Error: ${String(meta.error)}` };
    }
  }

  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
