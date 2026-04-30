import { MaqasidComparisonWheel } from '@ogden/ui-components';
import { MemoryRouter } from 'react-router-dom';
import { Eye, Lightbulb, Hammer } from 'lucide-react';
import styles from './OPAComparisonWheel.module.css';

interface OPAComparisonWheelProps {
  levelColor?: string;
  onSegmentSelect?: (segmentId: string) => void;
}

export default function OPAComparisonWheel({
  levelColor = '#8b7355',
  onSegmentSelect,
}: OPAComparisonWheelProps) {
  const segments = [
    {
      id: 'observe',
      label: 'Observe',
      current: 60,
      Icon: Eye,
      tooltipLabel: 'Next',
    },
    {
      id: 'plan',
      label: 'Plan',
      current: 35,
      Icon: Lightbulb,
      tooltipLabel: 'Next',
    },
    {
      id: 'act',
      label: 'Act',
      current: 20,
      Icon: Hammer,
      tooltipLabel: 'Next',
    },
  ];

  const nextActions = {
    observe: { site: 'Record baseline conditions and observations' },
    plan: { site: 'Design intervention strategy and approach' },
    act: { site: 'Implement actions and monitor progress' },
  };

  const handleSegmentSelect = (segmentId: string) => {
    if (onSegmentSelect) {
      onSegmentSelect(segmentId);
    }
  };

  // MaqasidComparisonWheel from @ogden/ui-components calls
  // react-router-dom's useNavigate internally. The host app uses
  // @tanstack/react-router and has no react-router-dom Router context,
  // so we wrap the wheel in a MemoryRouter to satisfy the hook
  // without affecting host navigation. Our onSegmentSelect prop catches
  // the click before any internal navigate would matter.
  return (
    <div className={styles.container}>
      <div className={styles.wheelWrapper}>
        <MemoryRouter>
          <MaqasidComparisonWheel
            centerLabel="WORKFLOW"
            levelColor={levelColor}
            segments={segments}
            nextActions={nextActions}
            showNextCard={true}
            showDiacritics={false}
            onSegmentSelect={handleSegmentSelect}
          />
        </MemoryRouter>
      </div>
    </div>
  );
}
