/**
 * ReportSharePage — public, view-only report share (spec §5.1.2).
 *
 * Renders outside AppShell with no header/sidebar. Accessed via
 * /report-share/:token by capital partners & allies with no login.
 *
 * It NEVER renders a live report — it only embeds the frozen
 * capital_partner_summary PDF, streamed THROUGH the API
 * (`/api/v1/portal/:token/report.pdf`) so the raw storage URL is never
 * exposed. Availability is gated server-side by token secrecy + the
 * `reportShare.published` flag; an unpublished/invalid token 404s and
 * this page shows a neutral "no longer available" state.
 */

import { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { api } from '../lib/apiClient.js';

type State = 'loading' | 'ready' | 'unavailable';

export default function ReportSharePage() {
  const { token } = useParams({ from: '/report-share/$token' });
  const pdfPath = api.portal.reportPdfPath(token);
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let cancelled = false;
    // Probe (no auth header) — confirms the token is published before we
    // commit the iframe, so an invalid link shows a clean message.
    fetch(pdfPath, { method: 'GET' })
      .then((res) => {
        if (cancelled) return;
        setState(res.ok ? 'ready' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setState('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [pdfPath]);

  if (state === 'loading') {
    return (
      <div style={shell}>
        <p style={{ color: '#6b7466' }}>Loading shared report…</p>
      </div>
    );
  }

  if (state === 'unavailable') {
    return (
      <div style={shell}>
        <h1 style={{ fontSize: 20, margin: 0, color: '#2b3327' }}>
          This report link is no longer available
        </h1>
        <p style={{ color: '#6b7466', margin: 0, maxWidth: 420, textAlign: 'center' }}>
          The owner may have unpublished it, or the link is incorrect.
          Please request a fresh link from the project steward.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#f6f8f4',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid #d8dcd6',
          fontSize: 13,
          color: '#2b3327',
        }}
      >
        <span>OGDEN Atlas · Shared project report (view-only)</span>
        <a
          href={pdfPath}
          download="ogden-atlas-report.pdf"
          style={{ color: '#4f9d5b', fontWeight: 600, textDecoration: 'none' }}
        >
          Download PDF
        </a>
      </header>
      <iframe
        title="Shared project report"
        src={pdfPath}
        style={{ flex: 1, border: 'none', width: '100%' }}
      />
    </div>
  );
}

const shell: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  gap: 14,
  background: '#f6f8f4',
  padding: 24,
};
