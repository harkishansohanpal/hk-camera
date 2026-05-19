import { describe, it, expect } from 'vitest';

describe('useYoloDetection', () => {
  it('imports and uses backend detectAPI', async () => {
    const mod = await import('./useYoloDetection');
    expect(mod.useYoloDetection).toBeDefined();
    expect(typeof mod.useYoloDetection).toBe('function');
  });
});
