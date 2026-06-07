import { describe, it, expect, beforeEach } from 'vitest';
import { useActSectorsEditorStore } from '../actSectorsEditorStore.js';

describe('actSectorsEditorStore', () => {
  beforeEach(() => {
    useActSectorsEditorStore.getState().close();
  });

  it('defaults to inactive', () => {
    expect(useActSectorsEditorStore.getState().active).toBe(false);
  });

  it('open() arms the rail takeover and close() reverts', () => {
    useActSectorsEditorStore.getState().open();
    expect(useActSectorsEditorStore.getState().active).toBe(true);
    useActSectorsEditorStore.getState().close();
    expect(useActSectorsEditorStore.getState().active).toBe(false);
  });
});
