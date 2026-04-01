/**
 * WizardNav — shared prev/next buttons for wizard steps.
 */

interface WizardNavProps {
  onBack: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  nextLabel?: string;
  nextDisabled?: boolean;
}

export default function WizardNav({
  onBack,
  onNext,
  isFirst,
  isLast,
  nextLabel,
  nextDisabled = false,
}: WizardNavProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
      {!isFirst ? (
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 24px',
            fontSize: 13,
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
      ) : (
        <div />
      )}

      <button
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          background: nextDisabled ? 'var(--color-earth-300)' : 'var(--color-earth-600)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '10px 28px',
          fontSize: 13,
          fontWeight: 500,
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          letterSpacing: '0.02em',
          opacity: nextDisabled ? 0.6 : 1,
        }}
      >
        {nextLabel ?? (isLast ? 'Create Project' : 'Continue')}
      </button>
    </div>
  );
}
