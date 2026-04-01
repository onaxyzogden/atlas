import type { WizardData } from '../../../pages/NewProjectPage.js';

export interface WizardStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
}
