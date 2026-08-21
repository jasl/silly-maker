// SPDX-License-Identifier: MIT
import { AuthoringDiagnosticErrorV1, createDiagnosticV1 } from "@sillymaker/base";

/**
 * Minimal PNG alpha-plane decoder for the `story regions trace` devtool
 * (shaped-hit-regions, accepted 2026-08-21). It reads exactly what a
 * silhouette trace needs — per-pixel alpha — from untrusted file bytes, so
 * admission is strict: bounded dimensions, exact inflated length, and a
 * structured diagnostic on every rejection. Color channels are ignored.
 *
 * Supported: 8/16-bit RGBA (color type 6), 8/16-bit gray+alpha (4), and
 * 8-bit palette (3) with a tRNS alpha table. Everything else — interlaced
 * images, alpha-less color types, sub-byte palettes — fails fast with a
 * reason; converting the source image is the author's one-time fix.
 */

export interface PngAlphaImageV1 {
  readonly width: number;
  readonly height: number;
  /** Row-major alpha samples, one byte per pixel (16-bit takes the high byte). */
  readonly alpha: Uint8Array;
}

const pngSignatureV1 = Object.freeze([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngMaxDimensionV1 = 8192;
const pngMaxPixelsV1 = 16_777_216;

function pngFailureV1(reason: string, message: string): never {
  throw new AuthoringDiagnosticErrorV1([
    createDiagnosticV1({
      code: "regions.trace_image_invalid",
      phase: "asset",
      message,
      details: { reason },
    }),
  ]);
}

function readU32V1(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>> 0
  );
}

interface PngHeaderV1 {
  readonly width: number;
  readonly height: number;
  readonly bitDepth: number;
  readonly colorType: number;
}

function parseHeaderV1(data: Uint8Array): PngHeaderV1 {
  if (data.length !== 13) pngFailureV1("ihdr_malformed", "PNG IHDR chunk has the wrong length");
  const width = readU32V1(data, 0);
  const height = readU32V1(data, 4);
  const bitDepth = data[8]!;
  const colorType = data[9]!;
  const compression = data[10]!;
  const filter = data[11]!;
  const interlace = data[12]!;
  if (
    width < 1 || height < 1 || width > pngMaxDimensionV1 || height > pngMaxDimensionV1 ||
    width * height > pngMaxPixelsV1
  ) {
    pngFailureV1(
      "dimensions_unsupported",
      `PNG dimensions ${String(width)}x${String(height)} are out of the supported range ` +
        `(1..${String(pngMaxDimensionV1)} per side, ${String(pngMaxPixelsV1)} pixels total)`,
    );
  }
  if (compression !== 0 || filter !== 0) {
    pngFailureV1("compression_unsupported", "PNG uses a non-standard compression/filter method");
  }
  if (interlace !== 0) {
    pngFailureV1(
      "interlace_unsupported",
      "interlaced (Adam7) PNGs are not supported; re-export the image without interlacing",
    );
  }
  if (colorType === 6 || colorType === 4) {
    if (bitDepth !== 8 && bitDepth !== 16) {
      pngFailureV1("bit_depth_unsupported", `PNG bit depth ${String(bitDepth)} is not supported`);
    }
  } else if (colorType === 3) {
    if (bitDepth !== 8) {
      pngFailureV1(
        "palette_depth_unsupported",
        "only 8-bit palette PNGs are supported; re-export with 8-bit indices",
      );
    }
  } else {
    pngFailureV1(
      "alpha_missing",
      `PNG color type ${String(colorType)} carries no alpha channel; ` +
        "a silhouette trace needs RGBA, gray+alpha, or palette+tRNS",
    );
  }
  return { width, height, bitDepth, colorType };
}

interface PngChunksV1 {
  readonly header: PngHeaderV1;
  readonly idat: Uint8Array;
  readonly transparency: Uint8Array | null;
}

function parseChunksV1(bytes: Uint8Array): PngChunksV1 {
  if (bytes.length < 8 || pngSignatureV1.some((expected, index) => bytes[index] !== expected)) {
    pngFailureV1("signature_invalid", "the file is not a PNG (bad signature)");
  }
  let offset = 8;
  let header: PngHeaderV1 | null = null;
  let transparency: Uint8Array | null = null;
  const idatParts: Uint8Array[] = [];
  let sawEnd = false;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) pngFailureV1("chunk_truncated", "PNG chunk header is truncated");
    const length = readU32V1(bytes, offset);
    if (length > bytes.length - offset - 12) {
      pngFailureV1("chunk_truncated", "PNG chunk data is truncated");
    }
    const type = String.fromCharCode(
      bytes[offset + 4]!,
      bytes[offset + 5]!,
      bytes[offset + 6]!,
      bytes[offset + 7]!,
    );
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      if (header !== null) pngFailureV1("ihdr_malformed", "PNG declares more than one IHDR chunk");
      header = parseHeaderV1(data);
    } else if (type === "IDAT") {
      idatParts.push(data);
    } else if (type === "tRNS") {
      transparency = data;
    } else if (type === "IEND") {
      sawEnd = true;
      break;
    }
  }
  if (header === null) pngFailureV1("ihdr_malformed", "PNG is missing its IHDR chunk");
  if (!sawEnd) pngFailureV1("chunk_truncated", "PNG is missing its IEND chunk");
  if (idatParts.length === 0) pngFailureV1("idat_missing", "PNG has no image data (IDAT)");
  const total = idatParts.reduce((sum, part) => sum + part.length, 0);
  const idat = new Uint8Array(total);
  let cursor = 0;
  for (const part of idatParts) {
    idat.set(part, cursor);
    cursor += part.length;
  }
  return { header, idat, transparency };
}

async function inflateV1(idat: Uint8Array, expectedLength: number): Promise<Uint8Array> {
  let buffer: ArrayBuffer;
  try {
    const stream = new Blob([idat as BlobPart]).stream()
      .pipeThrough(new DecompressionStream("deflate"));
    buffer = await new Response(stream).arrayBuffer();
  } catch {
    pngFailureV1("idat_corrupt", "PNG image data failed to decompress");
  }
  const raw = new Uint8Array(buffer);
  if (raw.length !== expectedLength) {
    pngFailureV1(
      "idat_length_mismatch",
      `PNG image data decompressed to ${String(raw.length)} bytes, ` +
        `expected ${String(expectedLength)}`,
    );
  }
  return raw;
}

function paethV1(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Reverses PNG scanline filters in place; returns rows without filter bytes. */
function unfilterV1(
  raw: Uint8Array,
  width: number,
  height: number,
  bytesPerPixel: number,
): Uint8Array {
  const rowBytes = width * bytesPerPixel;
  const out = new Uint8Array(rowBytes * height);
  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (rowBytes + 1)]!;
    const source = raw.subarray(row * (rowBytes + 1) + 1, (row + 1) * (rowBytes + 1));
    const target = row * rowBytes;
    const previous = target - rowBytes;
    if (filter > 4) pngFailureV1("filter_invalid", `PNG scanline filter ${String(filter)} invalid`);
    for (let column = 0; column < rowBytes; column += 1) {
      const left = column >= bytesPerPixel ? out[target + column - bytesPerPixel]! : 0;
      const up = row > 0 ? out[previous + column]! : 0;
      const upLeft = row > 0 && column >= bytesPerPixel
        ? out[previous + column - bytesPerPixel]!
        : 0;
      const value = source[column]!;
      out[target + column] = filter === 0
        ? value
        : filter === 1
        ? (value + left) & 0xff
        : filter === 2
        ? (value + up) & 0xff
        : filter === 3
        ? (value + ((left + up) >> 1)) & 0xff
        : (value + paethV1(left, up, upLeft)) & 0xff;
    }
  }
  return out;
}

/**
 * Decodes the alpha plane of a PNG. Untrusted input: throws an
 * `AuthoringDiagnosticErrorV1` (code `regions.trace_image_invalid`, with a
 * machine-readable `details.reason`) on any malformed or unsupported file.
 */
export async function decodePngAlphaV1(bytes: Uint8Array): Promise<PngAlphaImageV1> {
  const { header, idat, transparency } = parseChunksV1(bytes);
  const { width, height, bitDepth, colorType } = header;
  const channels = colorType === 6 ? 4 : colorType === 4 ? 2 : 1;
  const bytesPerPixel = channels * (bitDepth === 16 ? 2 : 1);
  const raw = await inflateV1(idat, height * (1 + width * bytesPerPixel));
  const pixels = unfilterV1(raw, width, height, bytesPerPixel);
  const alpha = new Uint8Array(width * height);
  if (colorType === 3) {
    if (transparency === null) {
      pngFailureV1(
        "alpha_missing",
        "palette PNG has no tRNS chunk; a silhouette trace needs per-pixel alpha",
      );
    }
    for (let index = 0; index < alpha.length; index += 1) {
      const paletteIndex = pixels[index]!;
      alpha[index] = paletteIndex < transparency.length ? transparency[paletteIndex]! : 255;
    }
  } else {
    // Alpha is the last channel; for 16-bit samples the high byte suffices.
    const alphaOffset = (channels - 1) * (bitDepth === 16 ? 2 : 1);
    for (let index = 0; index < alpha.length; index += 1) {
      alpha[index] = pixels[index * bytesPerPixel + alphaOffset]!;
    }
  }
  return Object.freeze({ width, height, alpha });
}
