import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ── CDN version sync guard ─────────────────────────────────────
// Prevents the bug where the WASM CDN URL falls out of sync with
// the installed onnxruntime-web package.

describe('WASM CDN version sync', () => {

  let installedVersion;
  let hookSource;

  beforeAll(() => {
    const pkg = JSON.parse(
      readFileSync(resolve(ROOT, 'package.json'), 'utf-8'),
    );
    installedVersion = pkg.dependencies['onnxruntime-web'].replace(/^[\^~]/, '');

    hookSource = readFileSync(
      resolve(__dirname, 'useYoloDetection.js'),
      'utf-8',
    );
  });

  it('installed onnxruntime-web version satisfies ^1.26.0', () => {
    const major = parseInt(installedVersion.split('.')[0], 10);
    expect(major).toBeGreaterThanOrEqual(1);
  });

  it('WASM CDN URL matches installed package version', () => {
    const match = hookSource.match(/onnxruntime-web@([\d.]+)\/dist/);
    expect(match).not.toBeNull();
    const cdnVersion = match[1];
    expect(cdnVersion).toBe(installedVersion);
  });

  it('WASM CDN URL uses jsdelivr', () => {
    expect(hookSource).toContain('cdn.jsdelivr.net/npm/onnxruntime-web');
  });

});

// ── Model URL check ─────────────────────────────────────────────

describe('ML model', () => {

  it('uses Hugging Face CDN URL for model', () => {
    const hookSource = readFileSync(
      resolve(__dirname, 'useYoloDetection.js'),
      'utf-8',
    );
    expect(hookSource).toContain('huggingface.co');
    expect(hookSource).toContain('yolo11s_640.onnx');
  });

});
