export const APRICOT_LANE_ATTRIBUTION =
  'Inspired by farms like Apricot Lane Farms and the rehabilitation arc shown in The Biggest Little Farm; Three Streams Farm is a fictional Ontario operation.';

export function AttributionFooter() {
  return (
    <footer style={{ padding: '32px 24px', borderTop: '1px solid #ddd', color: '#555', fontSize: 13 }}>
      <p>{APRICOT_LANE_ATTRIBUTION}</p>
      <p style={{ marginTop: 6 }}>
        <a href="/wiki/entities/three-streams-farm">Read the full Three Streams Farm canon →</a>
      </p>
    </footer>
  );
}
