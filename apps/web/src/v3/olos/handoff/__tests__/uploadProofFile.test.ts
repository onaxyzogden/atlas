import { describe, it, expect, vi, beforeEach } from 'vitest';

const { uploadMock } = vi.hoisted(() => ({ uploadMock: vi.fn() }));
vi.mock('../../../../lib/apiClient.js', () => ({
  api: { files: { upload: uploadMock } },
}));

import { uploadProofFile } from '../uploadProofFile.js';

describe('uploadProofFile', () => {
  beforeEach(() => uploadMock.mockReset());

  it('returns the storageUrl from a successful upload', async () => {
    uploadMock.mockResolvedValue({
      data: { id: 'f1', storageUrl: 'https://bucket/x.jpg' },
      error: null,
    });
    const file = new File([new Uint8Array([1, 2, 3])], 'x.jpg', { type: 'image/jpeg' });
    const uri = await uploadProofFile('server-1', file);
    expect(uri).toBe('https://bucket/x.jpg');
    expect(uploadMock).toHaveBeenCalledWith('server-1', file);
  });

  it('throws when the API returns an error envelope', async () => {
    uploadMock.mockResolvedValue({ data: null, error: { message: 'too big' } });
    const file = new File([new Uint8Array([1])], 'x.jpg', { type: 'image/jpeg' });
    await expect(uploadProofFile('server-1', file)).rejects.toThrow('too big');
  });
});
