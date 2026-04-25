/**
 * §6 PassiveSolarTuningCard — actionable rotation deltas per habitable structure.
 *
 * The PlacementScoringCard already scores per-structure long-axis alignment
 * against the equator (E-W ideal); this card translates that score into
 * actionable advisories — "rotate counter-clockwise 22°" — and rolls the
 * fleet into a parcel-level tuning summary so a steward can see at a glance
 * which dwellings deserve a footprint adjustment before construction starts.
 *
 *   • aligned   ≤ 15° off ideal (shipping-condition, no action)
 *   • tunable   15–45° off (worth rotating before final stake-out)
 *   • critical  > 45° off (long axis is N-S — rotate or accept reduced
 *                          winter passive gain)
 *
 * Glazing-facing primer: even a perfectly E-W aligned long axis depends on
 * the main glazing being on the equator-facing facade. Latitude resolves
 * which side that is (south for NH, north for SH).
 *
 * Pure presentation. Reads structures + project parcel boundary. No new
 * shared math, no map writes.
 */
import { useMemo } from 'react';
import { useStructureStore, type Structure, type StructureType } from '../../store/structureStore.js';
import css from './PassiveSolarTuningCard.module.css';

interface Props {
  projectId: string;
  lat: number;
}

const HABITABLE_TYPES: ReadonlySet<StructureType> = new Set<StructureType>([
  'cabin',
  'yurt',
  'greenhouse',
  'bathhouse',
  'prayer_space',
  'classroom',
  'earthship',
  'pavilion',
  'workshop',
  'tent_glamping',
]);

type Band = 'aligned' | 'tunable' | 'critical';

interface Row {
  id: string;
  name: string;
  type: StructureType;
  widthM: number;
  depthM: number;
  rotationDeg: number;
  longIsWidth: boolean;
  idealRot: number; // 0 (long-side W-E) or 90 (long-side W-E via depth)
  deviation: number; // 0–90, magnitude
  signedDelta: number; // signed degrees to rotate to reach ideal (range -45..45)
  band: Band;
  axisScore: number; // 0–40 pts, mirroring PlacementScoringCard math
  potentialGain: number; // pts gained if rotated to ideal
  glazingFace: 'south' | 'north';
}

function classify(deviation: number): Band {
  if (deviation <= 15) return 'aligned';
  if (deviation <= 45) return 'tunable';
  return 'critical';
}

function buildRow(s: Structure, lat: number): Row {
  const longIsWidth = s.widthM >= s.depthM;
  // PlacementScoringCard convention:
  //   longIsWidth → rotation 0 means width axis = E-W (long-side faces N/S)
  //   else        → rotation 90 means depth axis = E-W
  const idealRot = longIsWidth ? 0 : 90;
  // Reduce mod 180 so rotation 180 ≡ 0.
  const r180 = (((s.rotationDeg - idealRot) % 180) + 180) % 180;
  const deviation = Math.min(r180, 180 - r180);
  // Signed delta: how many degrees to rotate to reach the nearer ideal.
  // Positive = clockwise, negative = counter-clockwise.
  const signedDelta = r180 <= 90 ? -r180 : 180 - r180;
  const clampedSigned = signedDelta > 90 ? signedDelta - 180 : signedDelta < -90 ? signedDelta + 180 : signedDelta;
  const axisScore = Math.round(Math.max(0, 1 - deviation / 90) * 40);
  const potentialGain = 40 - axisScore;
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    widthM: s.widthM,
    depthM: s.depthM,
    rotationDeg: s.rotationDeg,
    longIsWidth,
    idealRot,
    deviation,
    signedDelta: clampedSigned,
    band: classify(deviation),
    axisScore,
    potentialGain,
    glazingFace: lat >= 0 ? 'south' : 'north',
  };
}

function bandLabel(b: Band): string {
  switch (b) {
    case 'aligned': return 'ALIGNED';
    case 'tunable': return 'TUNABLE';
    case 'critical': return 'CRITICAL';
  }
}

function advise(r: Row): string {
  if (r.band === 'aligned') {
    return `Within 15° of the ${r.longIsWidth ? 'width-axis' : 'depth-axis'} ideal — leave the footprint as drawn and concentrate glazing on the ${r.glazingFace}-facing long wall.`;
  }
  const dir = r.signedDelta > 0 ? 'clockwise' : 'counter-clockwise';
  const mag = Math.abs(Math.round(r.signedDelta));
  if (r.band === 'tunable') {
    return `Rotate ${dir} ${mag}° to bring the long axis within the equator-facing band. Projected gain: +${r.potentialGain} axis pts (current axis score ${r.axisScore}/40).`;
  }
  return `Long axis runs ${r.deviation.toFixed(0)}° off ideal — effectively N-S. ${mag}° ${dir} rotation recovers axis alignment, otherwise expect significantly reduced winter solar gain on a ${r.glazingFace}-facing wall.`;
}

const TYPE_LABEL: Partial<Record<StructureType, string>> = {
  cabin: 'Cabin',
  yurt: 'Yurt',
  greenhouse: 'Greenhouse',
  bathhouse: 'Bathhouse',
  prayer_space: 'Prayer space',
  classroom: 'Classroom',
  earthship: 'Earthship',
  pavilion: 'Pavilion',
  workshop: 'Workshop',
  tent_glamping: 'Tent / glamping',
};

export default function PassiveSolarTuningCard({ projectId, lat }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const habitable = useMemo(
    () =>
      allStructures.filter(
        (s) => s.projectId === projectId && HABITABLE_TYPES.has(s.type),
      ),
    [allStructures, projectId],
  );

  const rows = useMemo<Row[]>(
    () => habitable.map((s) => buildRow(s, lat)),
    [habitable, lat],
  );

  const totals = useMemo(() => {
    const aligned = rows.filter((r) => r.band === 'aligned').length;
    const tunable = rows.filter((r) => r.band === 'tunable').length;
    const critical = rows.filter((r) => r.band === 'critical').length;
    const totalRotationNeeded = rows.reduce((s, r) => s + Math.abs(r.signedDelta), 0);
    const totalGain = rows.reduce((s, r) => s + r.potentialGain, 0);
    return { aligned, tunable, critical, totalRotationNeeded, totalGain };
  }, [rows]);

  const hemisphereGlazing = lat >= 0 ? 'south' : 'north';
  const hemisphereName = lat >= 0 ? 'Northern' : 'Southern';

  if (habitable.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.head}>
          <div>
            <h3 className={css.title}>Passive-Solar Tuning</h3>
            <p className={css.hint}>
              Per-structure rotation advisories for cabins, yurts, greenhouses,
              prayer spaces, classrooms, and other habitable footprints. Place
              one or more habitable structures to populate this card.
            </p>
          </div>
          <span className={`${css.badge} ${css.badgeIdle ?? ''}`}>NO STRUCTURES</span>
        </div>
        <div className={css.empty}>No habitable structures placed for this project yet.</div>
      </div>
    );
  }

  const overallTone =
    totals.critical === 0 && totals.tunable === 0
      ? 'badgeGood'
      : totals.critical === 0
      ? 'badgeFair'
      : 'badgePoor';

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Passive-Solar Tuning</h3>
          <p className={css.hint}>
            Each habitable footprint scored against its <strong>long-axis E-W
            ideal</strong> and translated into a rotate-by-X advisory. Aligned
            ≤ 15°, Tunable 15–45°, Critical &gt; 45° off ideal.
          </p>
        </div>
        <span className={`${css.badge} ${css[overallTone]}`}>
          {totals.aligned}/{rows.length} ALIGNED
        </span>
      </div>

      <div className={css.primer}>
        <strong>{hemisphereName} hemisphere</strong> ({lat.toFixed(2)}°
        {lat >= 0 ? 'N' : 'S'}) — concentrate primary glazing on the{' '}
        <strong>{hemisphereGlazing}-facing long wall</strong> of each
        habitable footprint to capture winter sun. Axis alignment alone is
        not sufficient if the glazed facade looks at the wrong sky.
      </div>

      <div className={css.summaryGrid}>
        <div className={`${css.stat} ${totals.aligned === rows.length ? css.stat_good : ''}`}>
          <span className={css.statLabel}>Aligned</span>
          <span className={css.statValue}>{totals.aligned}</span>
          <span className={css.statSub}>≤ 15° off ideal</span>
        </div>
        <div className={`${css.stat} ${totals.tunable > 0 ? css.stat_fair : ''}`}>
          <span className={css.statLabel}>Tunable</span>
          <span className={css.statValue}>{totals.tunable}</span>
          <span className={css.statSub}>15–45° off</span>
        </div>
        <div className={`${css.stat} ${totals.critical > 0 ? css.stat_poor : ''}`}>
          <span className={css.statLabel}>Critical</span>
          <span className={css.statValue}>{totals.critical}</span>
          <span className={css.statSub}>&gt; 45° off</span>
        </div>
        <div className={`${css.stat} ${totals.totalGain > 60 ? css.stat_fair : totals.totalGain > 0 ? css.stat_fair : css.stat_good}`}>
          <span className={css.statLabel}>Recoverable pts</span>
          <span className={css.statValue}>+{totals.totalGain}</span>
          <span className={css.statSub}>{totals.totalRotationNeeded}° total rotation</span>
        </div>
      </div>

      <ul className={css.list}>
        {rows.map((r) => (
          <li key={r.id} className={`${css.row} ${css[`band_${r.band}`]}`}>
            <div className={css.rowMain}>
              <div className={css.rowMeta}>
                <span className={css.rowName}>{r.name}</span>
                <span className={css.rowType}>{TYPE_LABEL[r.type] ?? r.type}</span>
                <span className={css.rowDims}>{r.widthM.toFixed(1)} × {r.depthM.toFixed(1)} m{r.longIsWidth ? ' · width = long' : ' · depth = long'}</span>
              </div>
              <span className={`${css.rowBand} ${css[`tag_${r.band}`]}`}>
                {bandLabel(r.band)}
              </span>
            </div>

            {/* Visual gauge: 0–90° deviation, with the ≤15° aligned band marked */}
            <div className={css.gauge}>
              <div className={css.gaugeBar}>
                <div className={css.gaugeBand} style={{ left: '0%', width: '16.7%' }} />
                <div className={css.gaugeIdeal} style={{ left: '0%' }} />
                <div
                  className={`${css.gaugeMarker} ${css[`gaugeMark_${r.band}`]}`}
                  style={{ left: `${(r.deviation / 90) * 100}%` }}
                  title={`${r.deviation.toFixed(1)}° off ideal`}
                />
              </div>
              <span className={css.gaugeLabel}>{r.deviation.toFixed(0)}°</span>
            </div>

            <div className={css.rowFigures}>
              <div className={css.figure}>
                <span className={css.figLabel}>Current rot</span>
                <span className={css.figValue}>{r.rotationDeg.toFixed(0)}°</span>
              </div>
              <div className={css.figure}>
                <span className={css.figLabel}>Ideal rot</span>
                <span className={css.figValue}>{r.idealRot}°</span>
              </div>
              <div className={css.figure}>
                <span className={css.figLabel}>Suggested Δ</span>
                <span className={css.figValue}>
                  {r.signedDelta === 0
                    ? '0°'
                    : `${r.signedDelta > 0 ? '+' : ''}${r.signedDelta.toFixed(0)}°`}
                </span>
              </div>
              <div className={css.figure}>
                <span className={css.figLabel}>Axis score</span>
                <span className={css.figValue}>{r.axisScore}/40</span>
              </div>
            </div>
            <div className={css.rowAdvisory}>{advise(r)}</div>
          </li>
        ))}
      </ul>

      <p className={css.footnote}>
        Axis math mirrors the per-structure scoring already in
        PlacementScoringCard — this card adds the actionable rotation
        delta and parcel rollup. Only long-axis alignment is scored; main
        glazing placement, overhang depth, and thermal mass remain manual
        decisions guided by the {hemisphereGlazing}-facing primer above.
      </p>
    </div>
  );
}
