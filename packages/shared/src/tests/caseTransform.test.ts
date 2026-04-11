/**
 * Case transformation utilities — toCamelCase and toSnakeCase.
 */

import { describe, it, expect } from 'vitest';
import { toCamelCase, toSnakeCase } from '../lib/caseTransform.js';

describe('toCamelCase', () => {
  it('converts snake_case keys to camelCase', () => {
    const input = { user_name: 'Alice', project_id: '123', created_at: '2026-01-01' };
    const result = toCamelCase<{ userName: string; projectId: string; createdAt: string }>(input);
    expect(result).toEqual({ userName: 'Alice', projectId: '123', createdAt: '2026-01-01' });
  });

  it('handles nested objects', () => {
    const input = {
      user_info: {
        first_name: 'Alice',
        last_name: 'Smith',
        home_address: { zip_code: '12345' },
      },
    };
    const result = toCamelCase(input);
    expect(result).toEqual({
      userInfo: {
        firstName: 'Alice',
        lastName: 'Smith',
        homeAddress: { zipCode: '12345' },
      },
    });
  });

  it('handles arrays of objects', () => {
    const input = [{ user_name: 'Alice' }, { user_name: 'Bob' }];
    const result = toCamelCase<Array<{ userName: string }>>(input);
    expect(result).toEqual([{ userName: 'Alice' }, { userName: 'Bob' }]);
  });

  it('handles arrays nested in objects', () => {
    const input = {
      project_members: [
        { user_id: '1', display_name: 'Alice' },
        { user_id: '2', display_name: 'Bob' },
      ],
    };
    const result = toCamelCase(input);
    expect(result).toEqual({
      projectMembers: [
        { userId: '1', displayName: 'Alice' },
        { userId: '2', displayName: 'Bob' },
      ],
    });
  });

  it('returns null for null input', () => {
    expect(toCamelCase(null)).toBeNull();
  });

  it('returns undefined for undefined input', () => {
    expect(toCamelCase(undefined)).toBeUndefined();
  });

  it('returns primitives unchanged', () => {
    expect(toCamelCase('hello')).toBe('hello');
    expect(toCamelCase(42)).toBe(42);
    expect(toCamelCase(true)).toBe(true);
  });

  it('handles keys with multiple underscores', () => {
    const input = { data_completeness_score: 75, has_parcel_boundary: false };
    const result = toCamelCase(input);
    expect(result).toEqual({ dataCompletenessScore: 75, hasParcelBoundary: false });
  });

  it('leaves already-camelCase keys unchanged', () => {
    const input = { userName: 'Alice', projectId: '123' };
    const result = toCamelCase(input);
    expect(result).toEqual({ userName: 'Alice', projectId: '123' });
  });

  it('handles empty objects', () => {
    expect(toCamelCase({})).toEqual({});
  });

  it('handles empty arrays', () => {
    expect(toCamelCase([])).toEqual([]);
  });
});

describe('toSnakeCase', () => {
  it('converts camelCase keys to snake_case', () => {
    const input = { userName: 'Alice', projectId: '123', createdAt: '2026-01-01' };
    const result = toSnakeCase(input);
    expect(result).toEqual({ user_name: 'Alice', project_id: '123', created_at: '2026-01-01' });
  });

  it('handles nested objects', () => {
    const input = {
      userInfo: {
        firstName: 'Alice',
        homeAddress: { zipCode: '12345' },
      },
    };
    const result = toSnakeCase(input);
    expect(result).toEqual({
      user_info: {
        first_name: 'Alice',
        home_address: { zip_code: '12345' },
      },
    });
  });

  it('handles arrays of objects', () => {
    const input = [{ userName: 'Alice' }, { userName: 'Bob' }];
    const result = toSnakeCase(input);
    expect(result).toEqual([{ user_name: 'Alice' }, { user_name: 'Bob' }]);
  });

  it('returns null for null input', () => {
    expect(toSnakeCase(null)).toBeNull();
  });

  it('returns undefined for undefined input', () => {
    expect(toSnakeCase(undefined)).toBeUndefined();
  });

  it('returns primitives unchanged', () => {
    expect(toSnakeCase('hello')).toBe('hello');
    expect(toSnakeCase(42)).toBe(42);
  });

  it('handles keys with consecutive capitals', () => {
    // camelToSnake sees each capital individually
    const input = { myHTML: 'content' };
    const result = toSnakeCase(input);
    expect(result).toEqual({ my_h_t_m_l: 'content' });
  });

  it('handles empty objects and arrays', () => {
    expect(toSnakeCase({})).toEqual({});
    expect(toSnakeCase([])).toEqual([]);
  });
});

describe('roundtrip', () => {
  it('toCamelCase → toSnakeCase preserves structure', () => {
    const original = {
      project_id: '123',
      owner_id: 'abc',
      data_completeness_score: 75,
      nested_data: { sub_field: 'value' },
    };
    const camelized = toCamelCase(original);
    const backToSnake = toSnakeCase(camelized);
    expect(backToSnake).toEqual(original);
  });

  it('toSnakeCase → toCamelCase preserves structure', () => {
    const original = {
      projectId: '123',
      ownerId: 'abc',
      dataCompletenessScore: 75,
    };
    const snaked = toSnakeCase(original);
    const backToCamel = toCamelCase(snaked);
    expect(backToCamel).toEqual(original);
  });
});
