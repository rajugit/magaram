import { describe, expect, it } from 'vitest';
import { inspectImage } from '../src/media-validation.js';

describe('media inspection', () => {
  it('reads PNG dimensions', () => {
    const bytes = Buffer.alloc(24);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    bytes.writeUInt32BE(640, 16);
    bytes.writeUInt32BE(480, 20);
    expect(inspectImage(bytes, 'png')).toEqual({ kind: 'png', width: 640, height: 480 });
  });

  it('rejects oversized PNG dimensions', () => {
    const bytes = Buffer.alloc(24);
    bytes.writeUInt32BE(10_001, 16);
    bytes.writeUInt32BE(1, 20);
    expect(() => inspectImage(bytes, 'png')).toThrow('safe limit');
  });

  it('reads extended WebP dimensions', () => {
    const bytes = Buffer.alloc(30);
    bytes.write('VP8X', 12, 'ascii');
    bytes.writeUIntLE(1279, 24, 3);
    bytes.writeUIntLE(719, 27, 3);
    expect(inspectImage(bytes, 'webp')).toEqual({ kind: 'webp', width: 1280, height: 720 });
  });

  it('reads lossy VP8 WebP dimensions', () => {
    const bytes = Buffer.alloc(30);
    bytes.write('VP8 ', 12, 'ascii');
    bytes.writeUInt32LE(10, 16);
    bytes.set([0x00, 0x00, 0x00, 0x9d, 0x01, 0x2a], 20);
    bytes.writeUInt16LE(800, 26);
    bytes.writeUInt16LE(600, 28);
    expect(inspectImage(bytes, 'webp')).toEqual({ kind: 'webp', width: 800, height: 600 });
  });

  it('reads lossless VP8L WebP dimensions', () => {
    const bytes = Buffer.alloc(25);
    bytes.write('VP8L', 12, 'ascii');
    bytes.writeUInt32LE(5, 16);
    bytes[20] = 0x2f;
    const width = 321 - 1;
    const height = 123 - 1;
    bytes[21] = width & 0xff;
    bytes[22] = ((width >> 8) & 0x3f) | ((height & 0x03) << 6);
    bytes[23] = (height >> 2) & 0xff;
    bytes[24] = (height >> 10) & 0x0f;
    expect(inspectImage(bytes, 'webp')).toEqual({ kind: 'webp', width: 321, height: 123 });
  });

  it('rejects malformed WebP frames', () => {
    const bytes = Buffer.alloc(30);
    bytes.write('VP8 ', 12, 'ascii');
    bytes.writeUInt32LE(10, 16);
    expect(() => inspectImage(bytes, 'webp')).toThrow('frame header');
  });
});
