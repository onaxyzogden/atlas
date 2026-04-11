/**
 * Row factories for API test fixtures.
 * Returns snake_case DB rows matching what the mockDb returns.
 *
 * NOTE: Routes that call `.toISOString()` on timestamps (orgs, comments,
 * activity, members) need Date objects. Routes that go through
 * ProjectSummary.parse (projects) need ISO strings.
 */

export const TEST_USER_ID = 'a0000000-0000-0000-0000-000000000001';
export const TEST_USER_ID_2 = 'a0000000-0000-0000-0000-000000000002';
export const TEST_EMAIL = 'test@ogden.ag';
export const TEST_EMAIL_2 = 'reviewer@ogden.ag';
export const TEST_PASSWORD = 'password123';
export const TEST_PROJ_ID = 'b0000000-0000-0000-0000-000000000001';
export const TEST_PROJ_ID_2 = 'b0000000-0000-0000-0000-000000000002';
export const FAKE_ID = 'c0000000-0000-0000-0000-000000000099';
export const TEST_ORG_ID = 'd0000000-0000-0000-0000-000000000001';
export const NOW = '2026-01-01T00:00:00.000Z';
export const NOW_DATE = new Date(NOW);

export function userRow(overrides?: Record<string, unknown>) {
  return {
    id: TEST_USER_ID,
    email: TEST_EMAIL,
    display_name: 'Test User',
    ...overrides,
  };
}

/** Project row — timestamps are ISO strings for ProjectSummary.parse() */
export function projectRow(overrides?: Record<string, unknown>) {
  return {
    id: TEST_PROJ_ID,
    owner_id: TEST_USER_ID,
    name: 'Test Farm',
    description: null,
    status: 'active',
    project_type: null,
    country: 'US',
    province_state: null,
    conservation_auth_id: null,
    address: null,
    parcel_id: null,
    acreage: null,
    data_completeness_score: null,
    has_parcel_boundary: false,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

/** Member row — joined_at is Date for routes calling .toISOString() */
export function memberRow(overrides?: Record<string, unknown>) {
  return {
    user_id: TEST_USER_ID_2,
    email: TEST_EMAIL_2,
    display_name: 'Reviewer',
    role: 'designer',
    joined_at: NOW_DATE,
    ...overrides,
  };
}

/**
 * Comment row — field names match the SQL SELECT aliases:
 * pc.*, u.display_name AS author_name, u.email AS author_email
 * Timestamps are Date objects for routes calling .toISOString()
 */
export function commentRow(overrides?: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    project_id: TEST_PROJ_ID,
    author_id: TEST_USER_ID,
    author_name: 'Test User',
    author_email: TEST_EMAIL,
    text: 'Test comment',
    resolved: false,
    resolved_by: null,
    feature_id: null,
    feature_type: null,
    parent_id: null,
    lng: null,
    lat: null,
    created_at: NOW_DATE,
    updated_at: NOW_DATE,
    ...overrides,
  };
}

/** Org row — includes `plan` field expected by route handler */
export function orgRow(overrides?: Record<string, unknown>) {
  return {
    id: TEST_ORG_ID,
    name: 'Ogden Farms',
    plan: 'free',
    created_at: NOW_DATE,
    ...overrides,
  };
}

/** Org member row — includes joined_at as Date, correct field names */
export function orgMemberRow(overrides?: Record<string, unknown>) {
  return {
    user_id: TEST_USER_ID,
    email: TEST_EMAIL,
    display_name: 'Test User',
    role: 'owner',
    joined_at: NOW_DATE,
    ...overrides,
  };
}

/** Activity row — created_at is Date for .toISOString() */
export function activityRow(overrides?: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    project_id: TEST_PROJ_ID,
    user_id: TEST_USER_ID,
    action: 'project_created',
    entity_type: 'project',
    entity_id: TEST_PROJ_ID,
    metadata: null,
    created_at: NOW_DATE,
    user_name: 'Test User',
    user_email: TEST_EMAIL,
    ...overrides,
  };
}

export function suggestionRow(overrides?: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    project_id: TEST_PROJ_ID,
    feature_id: 'feat-001',
    feature_type: 'structure',
    proposed_by: TEST_USER_ID_2,
    status: 'pending',
    diff_payload: JSON.stringify({ properties: { name: 'Renamed' } }),
    comment: 'Suggest renaming',
    reviewed_by: null,
    reviewed_at: null,
    created_at: NOW_DATE,
    updated_at: NOW_DATE,
    display_name: 'Reviewer',
    email: TEST_EMAIL_2,
    ...overrides,
  };
}

export function portalRow(overrides?: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    project_id: TEST_PROJ_ID,
    share_token: 'share-token-abc123',
    is_published: true,
    data_masking_level: 'full',
    created_at: NOW_DATE,
    updated_at: NOW_DATE,
    ...overrides,
  };
}

export function exportRow(overrides?: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    project_id: TEST_PROJ_ID,
    format: 'pdf',
    status: 'completed',
    file_url: 'https://storage.example.com/exports/test.pdf',
    requested_by: TEST_USER_ID,
    created_at: NOW_DATE,
    completed_at: NOW_DATE,
    ...overrides,
  };
}

export function layerRow(overrides?: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    project_id: TEST_PROJ_ID,
    layer_type: 'elevation',
    fetch_status: 'complete',
    confidence: 'high',
    data_date: NOW,
    source_api: 'USGS 3DEP',
    attribution: 'U.S. Geological Survey',
    summary: JSON.stringify({ min_elevation_m: 185, max_elevation_m: 312 }),
    raw_data: null,
    created_at: NOW_DATE,
    updated_at: NOW_DATE,
    fetched_at: NOW_DATE,
    ...overrides,
  };
}
