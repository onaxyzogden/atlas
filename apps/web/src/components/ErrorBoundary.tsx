/**
 * ErrorBoundary — catches React rendering errors and shows a fallback UI.
 * Prevents one broken panel from crashing the entire app.
 *
 * GlobalErrorBoundary — top-level boundary with full-page recovery.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { neutral, semantic, error as errorToken } from '../lib/tokens.js';

/**
 * Fire-and-forget client-error telemetry for a caught render error.
 *
 * The dynamic import is load-bearing: GlobalErrorBoundary is mounted on every
 * path including `/showcase/*`, and `clientErrorLog` statically imports
 * apiClient. A static import here would pull the authed graph into the
 * showcase initial chunk and regress the bundle split
 * (wiki ADR 2026-05-21-atlas-showcase-bundle-split). Deferring it to the catch
 * path keeps it out of the entry graph and no-ops when telemetry is disabled.
 */
function reportBoundaryError(error: Error, info: ErrorInfo, boundary: string): void {
  void import('../lib/clientErrorLog.js')
    .then(({ recordClientError }) =>
      recordClientError({
        source: 'react_error_boundary',
        name: error.name || 'Error',
        message: error.message,
        stack: error.stack,
        context: {
          boundary,
          componentStack: info.componentStack?.slice(0, 4000),
        },
      }),
    )
    .catch(() => {
      /* telemetry must never break the boundary's fallback render */
    });
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[OGDEN ErrorBoundary${this.props.name ? ` \u2014 ${this.props.name}` : ''}]`, error, info.componentStack);
    reportBoundaryError(error, info, this.props.name ?? 'unnamed');
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div role="alert" aria-live="polite" style={{
          padding: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10, minHeight: 120,
          color: 'var(--color-panel-muted, #9a8a74)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, opacity: 0.5 }}>{'\u26A0'}</div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>
            {this.props.name ? `${this.props.name} encountered an error` : 'Something went wrong'}
          </div>
          <div style={{ fontSize: 10, opacity: 0.7, maxWidth: 300, lineHeight: 1.5 }}>
            {this.state.error?.message?.slice(0, 150)}
          </div>
          <button
            onClick={this.handleReset}
            style={{
              padding: '6px 16px', fontSize: 11, fontWeight: 500,
              border: '1px solid rgba(196,162,101,0.3)', borderRadius: 6,
              background: 'rgba(196,162,101,0.08)', color: semantic.sidebarActive, cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * GlobalErrorBoundary — wraps the entire app with full-page recovery UI.
 */
export class GlobalErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[OGDEN Global Error]', error, info.componentStack);
    reportBoundaryError(error, info, 'global');
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleClearData = () => {
    if (confirm('This will clear all OGDEN project data and reload the page. Your browser settings will be preserved. Are you sure?')) {
      try {
        const keysToRemove = Object.keys(localStorage).filter((k) => k.startsWith('ogden'));
        for (const key of keysToRemove) localStorage.removeItem(key);
      } catch { /* ok */ }
      window.location.reload();
    }
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: neutral[900], color: neutral[100],
          fontFamily: 'system-ui, -apple-system, sans-serif', gap: 16, padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: semantic.sidebarIcon, textTransform: 'uppercase' }}>
            OGDEN Land Design Atlas
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: semantic.sidebarActive }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 13, color: semantic.sidebarIcon, maxWidth: 400, lineHeight: 1.6 }}>
            The application encountered an unexpected error. Your project data is saved locally and should be safe.
          </p>
          <div style={{ fontSize: 11, padding: '8px 16px', background: 'rgba(196,78,63,0.1)', borderRadius: 6, color: errorToken.DEFAULT, maxWidth: 500, wordBreak: 'break-word' }}>
            {this.state.error?.message?.slice(0, 200)}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={this.handleReset} style={{ padding: '10px 24px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, background: 'rgba(196,162,101,0.15)', color: semantic.sidebarActive, cursor: 'pointer' }}>
              Try Again
            </button>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', fontSize: 13, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, background: 'transparent', color: semantic.sidebarIcon, cursor: 'pointer' }}>
              Reload Page
            </button>
            <button onClick={this.handleClearData} style={{ padding: '10px 24px', fontSize: 13, border: '1px solid rgba(196,78,63,0.2)', borderRadius: 8, background: 'transparent', color: errorToken.DEFAULT, cursor: 'pointer' }}>
              Clear Data
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
