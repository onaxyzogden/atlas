/**
 * ObserveShareViewerPage — public, view-only Observe presentation share
 * (OLOS Observe Dashboard Spec §6.2). Resolves the token client-side
 * against `presentationShareStore` (local-first per the locked Phase 4
 * decision), then renders the frozen `PresentationModeOverlay` with the
 * sections the share included.
 *
 * Rendered OUTSIDE AppShell — no header, no nav. The overlay drives
 * its own full-screen chrome via `mode='shared'`.
 *
 * Expired / unknown / revoked tokens land on a friendly empty state
 * with no project leakage. The viewer never mounts Mapbox (SiteOverview
 * keeps to text-only fields per the spec's "stable share viewer"
 * requirement).
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { usePresentationShareStore } from '../store/presentationShareStore.js';
import { useProjectStore } from '../store/projectStore.js';
import PresentationModeOverlay from '../v3/observe/dashboard/presentation/PresentationModeOverlay.js';
import { resolveShare, type ShareResolution } from './observeShareResolution.js';

export default function ObserveShareViewerPage() {
  const { token } = useParams({ from: '/v3/observe/share/$token' });
  const resolveToken = usePresentationShareStore((s) => s.resolveToken);
  const projects = useProjectStore((s) => s.projects);

  const [resolution, setResolution] = useState<ShareResolution>({ kind: 'loading' });

  useEffect(() => {
    if (!token) {
      setResolution({ kind: 'unavailable', reason: 'unknown' });
      return;
    }
    setResolution(resolveShare(token, resolveToken));
  }, [token, resolveToken]);

  const resolved = useMemo(() => {
    if (resolution.kind !== 'ready') return null;
    const hit = resolveToken(token);
    if (!hit) return null;
    const project = projects.find((p) => p.id === resolution.projectId);
    if (!project) return { ...hit, project: null as null };
    return { ...hit, project };
  }, [resolution, projects, resolveToken, token]);

  if (resolution.kind === 'loading') {
    return (
      <div style={shellStyle}>
        <p style={mutedStyle}>Loading shared view...</p>
      </div>
    );
  }

  if (
    resolution.kind === 'unavailable' ||
    !resolved ||
    !resolved.project
  ) {
    const headline =
      resolution.kind === 'unavailable' && resolution.reason === 'expired'
        ? 'This shared view has expired'
        : 'This shared view is no longer available';
    return (
      <div style={shellStyle}>
        <h1 style={titleStyle}>{headline}</h1>
        <p style={mutedStyle}>
          The owner may have revoked it, or the link is incorrect. Please
          request a fresh link from the project steward.
        </p>
      </div>
    );
  }

  return (
    <PresentationModeOverlay
      project={resolved.project}
      mode="shared"
      includedSections={resolved.share.sections}
      frozenAt={resolved.share.createdAt}
    />
  );
}

const shellStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: 24,
  background: '#0f0d0a',
  color: '#f2ede3',
  textAlign: 'center',
  fontFamily: 'inherit',
};

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  margin: 0,
  fontWeight: 600,
};

const mutedStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(242, 237, 227, 0.65)',
  maxWidth: 420,
};
