import { ApiError } from './api-response.js';

export type ImageKind = 'png' | 'jpeg' | 'webp';

export interface ImageInspection {
  kind: ImageKind;
  width: number;
  height: number;
}

const MAX_DIMENSION = 10_000;
const MAX_PIXELS = 40_000_000;

function dimensions(width: number, height: number): { width: number; height: number } {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    throw new ApiError(422, 'INVALID_MEDIA', 'Image dimensions are invalid.');
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS)
    throw new ApiError(422, 'INVALID_MEDIA', 'Image dimensions exceed the safe limit.');
  return { width, height };
}

function png(bytes: Buffer): ImageInspection {
  if (bytes.length < 24) throw new ApiError(422, 'INVALID_MEDIA', 'PNG data is incomplete.');
  return { kind: 'png', ...dimensions(bytes.readUInt32BE(16), bytes.readUInt32BE(20)) };
}

function jpeg(bytes: Buffer): ImageInspection {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    const isFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isFrame && segmentLength >= 7)
      return {
        kind: 'jpeg',
        ...dimensions(bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)),
      };
    offset += segmentLength;
  }
  throw new ApiError(422, 'INVALID_MEDIA', 'JPEG dimensions could not be read.');
}

function webp(bytes: Buffer): ImageInspection {
  if (bytes.length < 20) throw new ApiError(422, 'INVALID_MEDIA', 'WebP data is incomplete.');
  const chunk = bytes.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8X') {
    if (bytes.length < 30) throw new ApiError(422, 'INVALID_MEDIA', 'WebP data is incomplete.');
    const width = 1 + bytes.readUIntLE(24, 3);
    const height = 1 + bytes.readUIntLE(27, 3);
    return { kind: 'webp', ...dimensions(width, height) };
  }
  const chunkSize = bytes.readUInt32LE(16);
  const dataStart = 20;
  if (dataStart + chunkSize > bytes.length)
    throw new ApiError(422, 'INVALID_MEDIA', 'WebP data is incomplete.');
  if (chunk === 'VP8 ') {
    if (chunkSize < 10) throw new ApiError(422, 'INVALID_MEDIA', 'WebP data is incomplete.');
    if (
      bytes[dataStart + 3] !== 0x9d ||
      bytes[dataStart + 4] !== 0x01 ||
      bytes[dataStart + 5] !== 0x2a
    )
      throw new ApiError(422, 'INVALID_MEDIA', 'WebP frame header is invalid.');
    const width = bytes.readUInt16LE(dataStart + 6) & 0x3fff;
    const height = bytes.readUInt16LE(dataStart + 8) & 0x3fff;
    return { kind: 'webp', ...dimensions(width, height) };
  }
  if (chunk === 'VP8L') {
    if (bytes[dataStart] !== 0x2f || chunkSize < 5)
      throw new ApiError(422, 'INVALID_MEDIA', 'WebP frame header is invalid.');
    const width = 1 + (bytes[dataStart + 1] | ((bytes[dataStart + 2] & 0x3f) << 8));
    const height =
      1 +
      ((bytes[dataStart + 2] >> 6) |
        (bytes[dataStart + 3] << 2) |
        ((bytes[dataStart + 4] & 0x0f) << 10));
    return { kind: 'webp', ...dimensions(width, height) };
  }
  throw new ApiError(422, 'INVALID_MEDIA', 'This WebP variant cannot be safely inspected.');
}

export function inspectImage(bytes: Buffer, kind: ImageKind): ImageInspection {
  if (kind === 'png') return png(bytes);
  if (kind === 'jpeg') return jpeg(bytes);
  return webp(bytes);
}
