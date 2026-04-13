/**
 * ProjectSummaryExport — generates a printable one-page project summary.
 *
 * From the Atlas spec Section 0g.2:
 *   "Printable summary — one-click print layout for community meetings,
 *    showing map + key information on standard paper"
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore, ZONE_CATEGORY_CONFIG } from '../../store/zoneStore.js';
import { generateMockLayers, getLayerSummaryText } from '../../lib/mockLayerData.js';
import { earth, sage, semantic, zIndex } from '../../lib/tokens.js';

interface Props {
  project: LocalProject;
  onClose: () => void;
}

export default function ProjectSummaryExport({ project, onClose }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const layers = useMemo(() => generateMockLayers(project.country), [project.country]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: zIndex.modal,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: semantic.surface,
          borderRadius: 12,
          padding: 0,
          color: earth[900],
        }}
      >
        {/* Print controls — hidden when printing */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderBottom: `1px solid ${earth[200]}`,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>Project Summary</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '6px 16px',
                fontSize: 12,
                border: 'none',
                borderRadius: 6,
                background: semantic.primary,
                color: semantic.surface,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                fontSize: 14,
                border: `1px solid ${earth[200]}`,
                borderRadius: 6,
                background: 'transparent',
                color: semantic.textSubtle,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div style={{ padding: '24px 32px' }} id="print-content">
          {/* Header */}
          <div style={{ borderBottom: `2px solid ${semantic.primary}`, paddingBottom: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', color: semantic.textSubtle, textTransform: 'uppercase', marginBottom: 4 }}>
                  OGDEN Land Design Atlas
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{project.name}</h1>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: semantic.textSubtle }}>
                <div>Created: {new Date(project.createdAt).toLocaleDateString()}</div>
                <div>Updated: {new Date(project.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
            {project.description && (
              <p style={{ fontSize: 12, color: earth[700], marginTop: 8, lineHeight: 1.6 }}>
                {project.description}
              </p>
            )}
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left: Property Details */}
            <div>
              <SectionHeader>Property Details</SectionHeader>
              <DetailTable
                rows={[
                  ['Project Type', project.projectType ?? '—'],
                  ['Country', project.country],
                  ['Province/State', project.provinceState ?? '—'],
                  ['Address', project.address ?? '—'],
                  ['Parcel ID', project.parcelId ?? '—'],
                  ['Units', project.units],
                  ['Boundary', project.hasParcelBoundary ? 'Set' : 'Not set'],
                  ['Acreage', project.acreage ? `${project.acreage} ha` : '—'],
                ]}
              />
            </div>

            {/* Right: Data Status */}
            <div>
              <SectionHeader>Data Completeness</SectionHeader>
              <div style={{ fontSize: 11, lineHeight: 1.8 }}>
                {[
                  { label: 'Boundary', done: project.hasParcelBoundary },
                  { label: 'Address', done: !!project.address },
                  { label: 'Project Type', done: !!project.projectType },
                  { label: 'Parcel ID', done: !!project.parcelId },
                  { label: 'Province/State', done: !!project.provinceState },
                  { label: 'Owner Notes', done: !!project.ownerNotes },
                  { label: 'Zoning Notes', done: !!project.zoningNotes },
                  { label: 'Water Rights', done: !!project.waterRightsNotes },
                ].map((item) => (
                  <div key={item.label}>
                    {item.done ? '● ' : '○ '}
                    <span style={{ color: item.done ? earth[900] : semantic.textSubtle }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Zones */}
          {zones.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <SectionHeader>Land Zones ({zones.length})</SectionHeader>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${earth[200]}`, textAlign: 'left' }}>
                    <th style={{ padding: '4px 8px', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '4px 8px', fontWeight: 600 }}>Category</th>
                    <th style={{ padding: '4px 8px', fontWeight: 600 }}>Area</th>
                    <th style={{ padding: '4px 8px', fontWeight: 600 }}>Primary Use</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z.id} style={{ borderBottom: `1px solid ${earth[100]}` }}>
                      <td style={{ padding: '4px 8px' }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: z.color, marginRight: 4 }} />
                        {z.name}
                      </td>
                      <td style={{ padding: '4px 8px', color: semantic.textSubtle }}>
                        {ZONE_CATEGORY_CONFIG[z.category].label}
                      </td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                        {z.areaM2 > 10000
                          ? `${(z.areaM2 / 10000).toFixed(2)} ha`
                          : `${z.areaM2.toFixed(0)} m²`}
                      </td>
                      <td style={{ padding: '4px 8px', color: earth[700] }}>{z.primaryUse || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Site Data Summary */}
          <div style={{ marginTop: 24 }}>
            <SectionHeader>Site Data Summary</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {layers.map((layer) => (
                <div key={layer.layerType} style={{ fontSize: 10 }}>
                  <div style={{ fontWeight: 600, color: earth[700], marginBottom: 2, textTransform: 'capitalize' }}>
                    {layer.layerType.replace('_', ' ')}
                    <span style={{ fontWeight: 400, color: semantic.textSubtle, marginLeft: 4 }}>
                      ({layer.confidence} conf.)
                    </span>
                  </div>
                  {getLayerSummaryText(layer).map((line, i) => (
                    <div key={i} style={{ color: earth[900], lineHeight: 1.5 }}>{line}</div>
                  ))}
                  <div style={{ color: semantic.textSubtle, fontSize: 9, marginTop: 2 }}>
                    {layer.sourceApi}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {(project.ownerNotes || project.zoningNotes || project.accessNotes || project.waterRightsNotes) && (
            <div style={{ marginTop: 24 }}>
              <SectionHeader>Notes</SectionHeader>
              <div style={{ fontSize: 11, lineHeight: 1.6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {project.ownerNotes && <NoteBlock label="Owner Notes" text={project.ownerNotes} />}
                {project.zoningNotes && <NoteBlock label="Zoning" text={project.zoningNotes} />}
                {project.accessNotes && <NoteBlock label="Access" text={project.accessNotes} />}
                {project.waterRightsNotes && <NoteBlock label="Water Rights" text={project.waterRightsNotes} />}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 24, paddingTop: 12, borderTop: `1px solid ${earth[200]}`, fontSize: 9, color: semantic.textSubtle, textAlign: 'center' }}>
            Generated by OGDEN Land Design Atlas — {new Date().toLocaleDateString()} — For planning purposes only
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: semantic.primary,
        marginBottom: 8,
        paddingBottom: 4,
        borderBottom: `1px solid ${earth[200]}`,
      }}
    >
      {children}
    </h3>
  );
}

function DetailTable({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ fontSize: 11, lineHeight: 1.8 }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td style={{ color: semantic.textSubtle, paddingRight: 12, verticalAlign: 'top' }}>{label}</td>
            <td style={{ color: earth[900] }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div style={{ fontWeight: 600, color: earth[700], marginBottom: 2 }}>{label}</div>
      <div style={{ color: earth[900], background: earth[50], padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
    </div>
  );
}
