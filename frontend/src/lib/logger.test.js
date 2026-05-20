import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock VITE_LOG_LEVEL to be unset (defaults to info)
const origEnv = import.meta.env;
beforeEach(() => {
  vi.stubGlobal('import.meta', { env: { ...origEnv, VITE_LOG_LEVEL: undefined } });
});

describe('logger', () => {
  it('exports debug, info, warn, error, sep', async () => {
    const { logger } = await import('./logger');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.sep).toBe('function');
  });

  it('calls console.log for info', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { logger } = await import('./logger');
    logger.info('TestTag', 'hello', { x: 1 });
    expect(spy).toHaveBeenCalledOnce();
    const msg = spy.mock.calls[0][0];
    expect(msg).toContain('[INFO]');
    expect(msg).toContain('[TestTag]');
    expect(spy.mock.calls[0][1]).toBe('hello');
    expect(spy.mock.calls[0][2]).toEqual({ x: 1 });
    spy.mockRestore();
  });

  it('calls console.warn for warn', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { logger } = await import('./logger');
    logger.warn('WarnTag', 'warning msg');
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('[WARN]');
    spy.mockRestore();
  });

  it('calls console.error for error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { logger } = await import('./logger');
    logger.error('ErrTag', 'error msg', { err: 'boom' });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('[ERROR]');
    spy.mockRestore();
  });

  it('includes ISO timestamp in output', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { logger } = await import('./logger');
    logger.info('TS', 'test');
    const msg = spy.mock.calls[0][0];
    expect(msg).toMatch(/\d{4}-\d{2}-\d{2}T/);
    spy.mockRestore();
  });
});
