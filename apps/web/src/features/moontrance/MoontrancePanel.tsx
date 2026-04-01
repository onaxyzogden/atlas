/**
 * MoontrancePanel — OGDEN-specific identity features.
 * Men's cohort zones, hospitality sequence, Islamic-adab privacy,
 * dawn/sunset viewpoints, fire circle/gathering placement.
 */

import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useMemo } from 'react';

interface MoontancePanelProps {
  project: LocalProject;
}

export default function MoontrancePanel({ project }: MoontancePanelProps) {
  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === project.id);
  const structures = useStructureStore((s) => s.structures).filter((s) => s.projectId === project.id);

  const spiritualZones = useMemo(() => zones.filter((z) => z.category === 'spiritual'), [zones]);
  const retreatZones = useMemo(() => zones.filter((z) => z.category === 'retreat'), [zones]);
  const educationZones = useMemo(() => zones.filter((z) => z.category === 'education'), [zones]);
  const prayerSpaces = useMemo(() => structures.filter((s) => s.type === 'prayer_space'), [structures]);
  const bathhouses = useMemo(() => structures.filter((s) => s.type === 'bathhouse'), [structures]);
  const fireCircles = useMemo(() => structures.filter((s) => s.type === 'fire_circle'), [structures]);
  const lookouts = useMemo(() => structures.filter((s) => s.type === 'lookout'), [structures]);
  const classrooms = useMemo(() => structures.filter((s) => s.type === 'classroom'), [structures]);

  const sections = [
    {
      title: 'Prayer & Contemplation',
      icon: '\u{1F54C}',
      color: '#6B5B8A',
      items: [
        { label: 'Prayer Spaces', count: prayerSpaces.length, target: 1, note: 'At least one prayer pavilion sited for quiet reflection' },
        { label: 'Bathhouses (Wudu)', count: bathhouses.length, target: 1, note: 'Wudu facility accessible from prayer space' },
        { label: 'Spiritual Zones', count: spiritualZones.length, target: 1, note: 'Contemplation and remembrance areas' },
        { label: 'Qibla Orientation', count: prayerSpaces.length > 0 ? 1 : 0, target: 1, note: 'Prayer space oriented toward Qibla direction' },
      ],
    },
    {
      title: 'Hospitality & Guest Experience',
      icon: '\u{1F3D5}',
      color: '#8A6B5B',
      items: [
        { label: 'Retreat Zones', count: retreatZones.length, target: 1, note: 'Guest-facing hospitality areas' },
        { label: 'Fire Circles', count: fireCircles.length, target: 1, note: 'Gathering spaces for evening community' },
        { label: 'Scenic Lookouts', count: lookouts.length, target: 1, note: 'Dawn/sunset viewpoint experiences' },
        { label: 'Arrival Sequence', count: 0, target: 1, note: 'Designed guest arrival path (draw under Paths tab)' },
      ],
    },
    {
      title: 'Education & Formation',
      icon: '\u{1F4DA}',
      color: '#4A6B8A',
      items: [
        { label: 'Education Zones', count: educationZones.length, target: 1, note: 'Learning and immersion areas' },
        { label: 'Classrooms', count: classrooms.length, target: 1, note: 'Indoor/outdoor teaching spaces' },
      ],
    },
    {
      title: 'Islamic Adab & Privacy',
      icon: '\u{1F54B}',
      color: '#5B6B8A',
      items: [
        { label: 'Guest Privacy', count: retreatZones.length > 0 ? 1 : 0, target: 1, note: 'Visual and acoustic privacy for guest cabins' },
        { label: 'Gender-Conscious Zones', count: 0, target: 0, note: 'Plan separate circulation where relevant to program' },
        { label: 'Quiet Hours Zones', count: spiritualZones.length > 0 ? 1 : 0, target: 1, note: 'Zones designated for silence and reflection' },
      ],
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 6 }}>
        OGDEN Identity
      </h2>
      <p style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 20, lineHeight: 1.5, fontStyle: 'italic' }}>
        Features that make this distinctly OGDEN {'\u2014'} not a generic farm tool or retreat planner.
      </p>

      {sections.map((section) => (
        <div key={section.title} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>{section.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: section.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {section.title}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {section.items.map((item) => {
              const met = item.target === 0 || item.count >= item.target;
              return (
                <div
                  key={item.label}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '8px 10px', borderRadius: 6,
                    background: met ? 'rgba(45,122,79,0.04)' : 'rgba(196,162,101,0.04)',
                    border: `1px solid ${met ? 'rgba(45,122,79,0.1)' : 'rgba(196,162,101,0.1)'}`,
                  }}
                >
                  <span style={{ fontSize: 12, marginTop: 1, flexShrink: 0 }}>
                    {met ? '\u2705' : '\u25CB'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>
                      {item.label}
                      {item.target > 0 && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: met ? '#2d7a4f' : '#c4a265' }}>
                          {item.count}/{item.target}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', lineHeight: 1.4, marginTop: 2 }}>
                      {item.note}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Guiding principle */}
      <div style={{
        padding: '14px 16px', background: 'rgba(107,91,138,0.06)',
        borderRadius: 10, border: '1px solid rgba(107,91,138,0.12)',
        borderLeft: '3px solid rgba(107,91,138,0.3)',
        marginTop: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6B5B8A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Design Principle
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', lineHeight: 1.7, fontStyle: 'italic' }}>
          {'"'}Every feature exists to help land serve its highest purpose {'\u2014'} ecologically, spiritually, economically, and generationally.{'"'}
        </div>
      </div>
    </div>
  );
}
