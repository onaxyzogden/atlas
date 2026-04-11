/**
 * Zod schema validation tests — verify parse/safeParse for key schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  // Project schemas
  Country, ProjectStatus, ProjectType, CreateProjectInput, ProjectSummary,
  // Collaboration schemas
  ProjectRole, OrgRole, CreateCommentInput, InviteMemberInput,
  CreateOrganizationInput, ActivityAction, CreateSuggestedEditInput,
  ReviewSuggestedEditInput,
  // Portal schemas
  PortalSection, DataMaskingLevel, CreatePortalInput,
  // Export schemas
  ExportType, CreateExportInput,
  // Assessment schemas
  ConfidenceLevel,
  // Layer schemas
  FetchStatus,
  // Design feature schemas
  DesignFeatureType,
} from '../index.js';

// ─── Enums ──────────────────────────────────────────────────────────────────

describe('Country enum', () => {
  it('accepts US and CA', () => {
    expect(Country.parse('US')).toBe('US');
    expect(Country.parse('CA')).toBe('CA');
  });
  it('rejects invalid country', () => {
    expect(Country.safeParse('UK').success).toBe(false);
  });
});

describe('ProjectStatus enum', () => {
  it('accepts valid statuses', () => {
    expect(ProjectStatus.parse('active')).toBe('active');
    expect(ProjectStatus.parse('archived')).toBe('archived');
    expect(ProjectStatus.parse('shared')).toBe('shared');
  });
  it('rejects invalid status', () => {
    expect(ProjectStatus.safeParse('deleted').success).toBe(false);
  });
});

describe('ProjectType enum', () => {
  it('accepts all project types', () => {
    const types = ['regenerative_farm', 'retreat_center', 'homestead',
      'educational_farm', 'conservation', 'multi_enterprise', 'moontrance'];
    for (const t of types) {
      expect(ProjectType.parse(t)).toBe(t);
    }
  });
});

describe('ProjectRole enum', () => {
  it('accepts owner, designer, reviewer, viewer', () => {
    expect(ProjectRole.parse('owner')).toBe('owner');
    expect(ProjectRole.parse('designer')).toBe('designer');
    expect(ProjectRole.parse('reviewer')).toBe('reviewer');
    expect(ProjectRole.parse('viewer')).toBe('viewer');
  });
  it('rejects admin', () => {
    expect(ProjectRole.safeParse('admin').success).toBe(false);
  });
});

describe('OrgRole enum', () => {
  it('accepts owner, admin, editor, viewer', () => {
    expect(OrgRole.parse('owner')).toBe('owner');
    expect(OrgRole.parse('admin')).toBe('admin');
  });
});

describe('ConfidenceLevel enum', () => {
  it('accepts high, medium, low', () => {
    expect(ConfidenceLevel.parse('high')).toBe('high');
    expect(ConfidenceLevel.parse('medium')).toBe('medium');
    expect(ConfidenceLevel.parse('low')).toBe('low');
  });
  it('rejects unknown', () => {
    expect(ConfidenceLevel.safeParse('unknown').success).toBe(false);
  });
});

describe('FetchStatus enum', () => {
  it('accepts all statuses', () => {
    for (const s of ['pending', 'fetching', 'complete', 'failed', 'unavailable']) {
      expect(FetchStatus.parse(s)).toBe(s);
    }
  });
});

describe('ActivityAction enum', () => {
  it('accepts all action types', () => {
    expect(ActivityAction.parse('comment_added')).toBe('comment_added');
    expect(ActivityAction.parse('member_joined')).toBe('member_joined');
    expect(ActivityAction.parse('suggestion_approved')).toBe('suggestion_approved');
  });
});

describe('ExportType enum', () => {
  it('accepts all export types', () => {
    expect(ExportType.parse('site_assessment')).toBe('site_assessment');
    expect(ExportType.parse('field_notes')).toBe('field_notes');
    expect(ExportType.parse('investor_summary')).toBe('investor_summary');
  });
});

describe('PortalSection enum', () => {
  it('accepts all section types', () => {
    expect(PortalSection.parse('hero')).toBe('hero');
    expect(PortalSection.parse('map')).toBe('map');
    expect(PortalSection.parse('stageReveal')).toBe('stageReveal');
  });
});

describe('DataMaskingLevel enum', () => {
  it('accepts full, curated, minimal', () => {
    expect(DataMaskingLevel.parse('full')).toBe('full');
    expect(DataMaskingLevel.parse('curated')).toBe('curated');
    expect(DataMaskingLevel.parse('minimal')).toBe('minimal');
  });
});

describe('DesignFeatureType enum', () => {
  it('accepts all types', () => {
    for (const t of ['zone', 'structure', 'path', 'point', 'annotation']) {
      expect(DesignFeatureType.parse(t)).toBe(t);
    }
  });
});

// ─── Object schemas ─────────────────────────────────────────────────────────

describe('CreateProjectInput', () => {
  it('parses valid input', () => {
    const result = CreateProjectInput.parse({
      name: 'Test Farm',
      country: 'US',
      units: 'metric',
    });
    expect(result.name).toBe('Test Farm');
    expect(result.country).toBe('US');
  });

  it('parses with optional fields', () => {
    const result = CreateProjectInput.parse({
      name: 'Test Farm',
      country: 'CA',
      units: 'imperial',
      description: 'A test farm',
      projectType: 'regenerative_farm',
      provinceState: 'Ontario',
    });
    expect(result.description).toBe('A test farm');
    expect(result.projectType).toBe('regenerative_farm');
  });

  it('rejects missing name', () => {
    expect(CreateProjectInput.safeParse({ country: 'US', units: 'metric' }).success).toBe(false);
  });

  it('rejects invalid country', () => {
    expect(CreateProjectInput.safeParse({ name: 'Farm', country: 'UK', units: 'metric' }).success).toBe(false);
  });
});

describe('ProjectSummary', () => {
  it('parses a valid project summary', () => {
    const result = ProjectSummary.parse({
      id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Test Farm',
      description: null,
      status: 'active',
      projectType: null,
      country: 'US',
      provinceState: null,
      conservationAuthId: null,
      address: null,
      parcelId: null,
      acreage: null,
      dataCompletenessScore: null,
      hasParcelBoundary: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.name).toBe('Test Farm');
    expect(result.status).toBe('active');
  });
});

describe('CreateCommentInput', () => {
  it('parses minimal input', () => {
    const result = CreateCommentInput.parse({ text: 'Hello' });
    expect(result.text).toBe('Hello');
  });

  it('parses with location', () => {
    const result = CreateCommentInput.parse({
      text: 'Note here',
      location: [-80.0, 40.0],
    });
    expect(result.location).toEqual([-80.0, 40.0]);
  });

  it('rejects empty text', () => {
    expect(CreateCommentInput.safeParse({ text: '' }).success).toBe(false);
  });
});

describe('InviteMemberInput', () => {
  it('parses valid invite', () => {
    const result = InviteMemberInput.parse({
      email: 'user@example.com',
      role: 'designer',
    });
    expect(result.role).toBe('designer');
  });

  it('rejects owner role for invite', () => {
    expect(InviteMemberInput.safeParse({ email: 'user@test.com', role: 'owner' }).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(InviteMemberInput.safeParse({ email: 'not-email', role: 'viewer' }).success).toBe(false);
  });
});

describe('CreateOrganizationInput', () => {
  it('parses valid name', () => {
    const result = CreateOrganizationInput.parse({ name: 'Ogden Farms' });
    expect(result.name).toBe('Ogden Farms');
  });

  it('rejects empty name', () => {
    expect(CreateOrganizationInput.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('CreateExportInput', () => {
  it('parses minimal export request', () => {
    const result = CreateExportInput.parse({ exportType: 'site_assessment' });
    expect(result.exportType).toBe('site_assessment');
  });

  it('rejects invalid export type', () => {
    expect(CreateExportInput.safeParse({ exportType: 'invalid' }).success).toBe(false);
  });
});

describe('CreateSuggestedEditInput', () => {
  it('parses with property diff', () => {
    const result = CreateSuggestedEditInput.parse({
      featureId: 'f0000000-0000-0000-0000-000000000001',
      diffPayload: {
        properties: {
          before: { name: 'Old' },
          after: { name: 'New' },
        },
      },
    });
    expect(result.diffPayload.properties?.after).toEqual({ name: 'New' });
  });

  it('parses with optional comment', () => {
    const result = CreateSuggestedEditInput.parse({
      featureId: 'f0000000-0000-0000-0000-000000000001',
      diffPayload: {},
      comment: 'Please review',
    });
    expect(result.comment).toBe('Please review');
  });
});

describe('ReviewSuggestedEditInput', () => {
  it('accepts approved', () => {
    expect(ReviewSuggestedEditInput.parse({ action: 'approved' }).action).toBe('approved');
  });

  it('accepts rejected', () => {
    expect(ReviewSuggestedEditInput.parse({ action: 'rejected' }).action).toBe('rejected');
  });

  it('rejects pending', () => {
    expect(ReviewSuggestedEditInput.safeParse({ action: 'pending' }).success).toBe(false);
  });
});

describe('CreatePortalInput', () => {
  it('parses full portal input', () => {
    const result = CreatePortalInput.parse({
      slug: 'test-farm',
      isPublished: false,
      heroTitle: 'Welcome',
      heroSubtitle: 'Subtitle',
      missionStatement: 'Our mission',
      sections: ['hero', 'map'],
      donationUrl: null,
      inquiryEmail: null,
      dataMaskingLevel: 'full',
      curatedHotspots: [],
      brandColor: '#2D5016',
      beforeAfterPairs: [],
      storyScenes: [],
    });
    expect(result.slug).toBe('test-farm');
    expect(result.sections).toHaveLength(2);
  });
});
