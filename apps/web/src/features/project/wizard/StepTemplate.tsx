/**
 * StepTemplate — Phase 4 (2026-05-21) optional Step 0 of the
 * NewProjectPage wizard. Lets the visitor either start from a public
 * project template ("Ecosystem Farm (Apricot-Lane-style)") or proceed
 * with a blank project.
 *
 * The step is auto-skipped from NewProjectPage when a `prefillTemplate`
 * search-param is present in the URL (the showcase ContactCTA + the
 * /register tier paths thread that through). When skipped, the wizard
 * starts on StepBasicInfo as before.
 *
 * Locked Phase 4 decision: only one public template ships in v1
 * ("ecosystem-farm"); we still fetch GET /templates so a future
 * gallery surface is a single-line change.
 *
 * No CSRA / advance-purchase / member / investor language anywhere
 * in this surface, per the 2026-05-04 erasure ADR.
 */

import { useEffect, useState } from 'react';
import { api } from '../../../lib/apiClient.js';
import type { WizardStepProps } from './types.js';
import WizardNav from './WizardNav.js';

interface PublicTemplate {
  id: string;
  name: string;
  slug?: string | null;
  public?: boolean;
}

const cardBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 16,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  transition: 'var(--transition-base)',
};

const cardSelected: React.CSSProperties = {
  ...cardBase,
  borderColor: 'var(--color-earth-600)',
  boxShadow: '0 0 0 1px var(--color-earth-600) inset',
};

export default function StepTemplate({
  data,
  updateData,
  onNext,
  onBack,
  isFirst,
  isLast,
}: WizardStepProps) {
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: rows } = await api.templates.list();
        if (cancelled) return;
        const publicOnes = (rows ?? []).filter((t) => t.public && t.slug);
        setTemplates(publicOnes);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : 'Could not load template gallery.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = data.templateSlug ?? '';

  function pickBlank() {
    updateData({ templateSlug: undefined });
  }

  function pickTemplate(slug: string) {
    updateData({ templateSlug: slug });
  }

  return (
    <div
      style={{
        maxWidth: 540,
        margin: '0 auto',
        padding: '40px 20px',
        overflowY: 'auto',
        height: '100%',
      }}
    >
      <h2
        style={{
          fontSize: 20,
          fontWeight: 400,
          marginBottom: 8,
          color: 'var(--color-text)',
        }}
      >
        Start from a template?
      </h2>
      <p
        style={{
          fontSize: 13,
          color: 'var(--color-text-muted)',
          marginBottom: 24,
          lineHeight: 1.6,
        }}
      >
        Templates pre-load a phasing scaffold, designed-map palette, and
        monitoring trajectory so you can edit instead of starting blank.
        You'll draw your own parcel boundary in a later step — the template
        repositions itself onto your land.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          type="button"
          onClick={pickBlank}
          style={selected === '' ? cardSelected : cardBase}
        >
          <span style={{ fontSize: 15, fontWeight: 500 }}>Start blank</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Empty project. You design everything from scratch.
          </span>
        </button>

        {loading && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              padding: 12,
            }}
          >
            Loading templates…
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              padding: 12,
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Couldn’t load template gallery. You can continue with a blank
            project.
          </div>
        )}

        {!loading &&
          !error &&
          templates.map((t) => {
            const slug = t.slug ?? '';
            const isSelected = selected === slug;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => pickTemplate(slug)}
                style={isSelected ? cardSelected : cardBase}
              >
                <span style={{ fontSize: 15, fontWeight: 500 }}>{t.name}</span>
                {slug === 'ecosystem-farm' && (
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    Pre-loads the Three Streams Farm pattern: 4-phase
                    rehabilitation arc (water + cover → perennials → polyculture
                    → ecosystem stability), ~22 designed features, 24-month
                    monitoring baseline, and a nursery propagation pipeline.
                    Inspired by farms like Apricot Lane Farms.
                  </span>
                )}
              </button>
            );
          })}
      </div>

      <WizardNav
        onBack={onBack}
        onNext={onNext}
        isFirst={isFirst}
        isLast={isLast}
        nextLabel="Continue"
      />
    </div>
  );
}
