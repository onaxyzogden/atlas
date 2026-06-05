/**
 * Shared types for the Step 3 Team form. Kept in its own module so
 * TeamInviteRow and WizardStep3Team can both import them without one
 * pulling the other into the dep graph.
 */

export type TeamInviteRole =
  | 'team_member'
  | 'contractor'
  | 'landowner'
  | 'reviewer';
