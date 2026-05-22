import { describe, it, expect } from 'vitest';
import {
  ClientErrorEventInput,
  PostClientErrorsBody,
  CLIENT_ERROR_SOURCES,
} from '../clientErrorTelemetry.schema.js';

const base = {
  sessionId: 'sess-1',
  occurredAt: '2026-05-21T12:00:00.000Z',
  projectId: null,
  source: 'persist_rehydrate' as const,
  name: 'SyntaxError',
  message: 'Unexpected token',
};

describe('ClientErrorEventInput', () => {
  it('parses a minimal valid event with a null projectId', () => {
    const parsed = ClientErrorEventInput.parse(base);
    expect(parsed.projectId).toBeNull();
    // defaults applied
    expect(parsed.context).toEqual({});
  });

  it('accepts a uuid projectId', () => {
    const parsed = ClientErrorEventInput.parse({
      ...base,
      projectId: '11111111-1111-4111-8111-111111111111',
    });
    expect(parsed.projectId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('defaults message to empty string when omitted', () => {
    const { message: _m, ...noMessage } = base;
    const parsed = ClientErrorEventInput.parse(noMessage);
    expect(parsed.message).toBe('');
  });

  it('keeps the context payload (e.g. persistKey)', () => {
    const parsed = ClientErrorEventInput.parse({
      ...base,
      context: { persistKey: 'ogden-conventional-crops' },
    });
    expect(parsed.context).toEqual({ persistKey: 'ogden-conventional-crops' });
  });

  it('rejects an unknown source', () => {
    expect(() => ClientErrorEventInput.parse({ ...base, source: 'mystery' })).toThrow();
  });

  it('rejects an empty name', () => {
    expect(() => ClientErrorEventInput.parse({ ...base, name: '' })).toThrow();
  });

  it('rejects a non-uuid, non-null projectId', () => {
    expect(() => ClientErrorEventInput.parse({ ...base, projectId: 'nope' })).toThrow();
  });

  it('rejects an over-long message (>4000 chars)', () => {
    expect(() =>
      ClientErrorEventInput.parse({ ...base, message: 'x'.repeat(4001) }),
    ).toThrow();
  });

  it('exposes the four known sources', () => {
    expect(CLIENT_ERROR_SOURCES).toContain('persist_rehydrate');
    expect(CLIENT_ERROR_SOURCES).toContain('api_client');
    expect(CLIENT_ERROR_SOURCES).toContain('react_error_boundary');
    expect(CLIENT_ERROR_SOURCES).toContain('unhandled_rejection');
  });
});

describe('PostClientErrorsBody', () => {
  it('accepts a 1-event batch', () => {
    expect(PostClientErrorsBody.parse({ events: [base] }).events).toHaveLength(1);
  });

  it('rejects an empty batch', () => {
    expect(() => PostClientErrorsBody.parse({ events: [] })).toThrow();
  });

  it('rejects a batch over the 50-event cap', () => {
    expect(() =>
      PostClientErrorsBody.parse({ events: Array.from({ length: 51 }, () => base) }),
    ).toThrow();
  });
});
