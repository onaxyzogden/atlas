/**
 * ProofSlotCapture — router by `slot.proofType`. Each branch resolves to
 * the type-specific capture component. Keeping this thin means the
 * orchestrator (`ProofSlotList`) and the inline ActTaskDetail markup
 * only ever talk to a single capture entry point.
 */

import type {
  FieldActionProofItem,
  ProofSchemaSlot,
} from '@ogden/shared';
import NoteCapture from './NoteCapture.js';
import MeasurementCapture from './MeasurementCapture.js';
import PhotoCapture from './PhotoCapture.js';
import DocumentCapture from './DocumentCapture.js';
import GpsPointCapture from './GpsPointCapture.js';
import GpsTraceCapture from './GpsTraceCapture.js';
import LoggedResultCapture from './LoggedResultCapture.js';

interface Props {
  projectId: string;
  actionId: string;
  slot: ProofSchemaSlot;
  existing: FieldActionProofItem | undefined;
}

export default function ProofSlotCapture(props: Props) {
  switch (props.slot.proofType) {
    case 'photo':
      return <PhotoCapture {...props} />;
    case 'document':
      return <DocumentCapture {...props} />;
    case 'gps_point':
      return <GpsPointCapture {...props} />;
    case 'gps_trace':
      return <GpsTraceCapture {...props} />;
    case 'measurement':
      return <MeasurementCapture {...props} />;
    case 'logged_result':
      return <LoggedResultCapture {...props} />;
    case 'note':
      return <NoteCapture {...props} />;
    default:
      return null;
  }
}
