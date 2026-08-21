// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { decodePngAlphaV1 } from "./png-alpha.ts";

/**
 * Test-side PNG encoder: real chunks, real zlib (CompressionStream), real
 * scanline filters, so the decoder is proven against the actual format
 * rather than fixtures.
 */

function u32V1(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function chunkV1(type: string, data: readonly number[]): number[] {
  return [
    ...u32V1(data.length),
    ...type.split("").map((char) => char.charCodeAt(0)),
    ...data,
    // The decoder deliberately ignores CRCs; zeros keep the layout honest.
    0,
    0,
    0,
    0,
  ];
}

async function deflateV1(raw: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([raw as BlobPart]).stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function paethV1(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Applies one PNG filter to a scanline (encode direction: raw - predictor). */
function filterRowV1(
  filter: number,
  row: Uint8Array,
  previous: Uint8Array | null,
  bytesPerPixel: number,
): number[] {
  const out: number[] = [filter];
  for (let column = 0; column < row.length; column += 1) {
    const left = column >= bytesPerPixel ? row[column - bytesPerPixel]! : 0;
    const up = previous?.[column] ?? 0;
    const upLeft = column >= bytesPerPixel ? previous?.[column - bytesPerPixel] ?? 0 : 0;
    const value = row[column]!;
    out.push(
      filter === 0
        ? value
        : filter === 1
        ? (value - left) & 0xff
        : filter === 2
        ? (value - up) & 0xff
        : filter === 3
        ? (value - ((left + up) >> 1)) & 0xff
        : (value - paethV1(left, up, upLeft)) & 0xff,
    );
  }
  return out;
}

interface EncodePngInputV1 {
  readonly width: number;
  readonly height: number;
  readonly colorType: number;
  readonly bitDepth?: number;
  /** Raw sample bytes, row-major, already in channel layout. */
  readonly pixels: Uint8Array;
  readonly transparency?: readonly number[];
  readonly filters?: readonly number[];
  readonly interlace?: number;
  /** Splits the compressed stream across this many IDAT chunks. */
  readonly idatParts?: number;
}

async function encodePngV1(input: EncodePngInputV1): Promise<Uint8Array> {
  const bitDepth = input.bitDepth ?? 8;
  const channels = input.colorType === 6
    ? 4
    : input.colorType === 4
    ? 2
    : input.colorType === 2
    ? 3
    : 1;
  const bytesPerPixel = channels * (bitDepth === 16 ? 2 : 1);
  const rowBytes = input.width * bytesPerPixel;
  const filtered: number[] = [];
  let previous: Uint8Array | null = null;
  for (let row = 0; row < input.height; row += 1) {
    const line = input.pixels.subarray(row * rowBytes, (row + 1) * rowBytes);
    filtered.push(...filterRowV1(input.filters?.[row] ?? 0, line, previous, bytesPerPixel));
    previous = line;
  }
  const compressed = await deflateV1(new Uint8Array(filtered));
  const idatParts = input.idatParts ?? 1;
  const idatChunks: number[] = [];
  const partSize = Math.ceil(compressed.length / idatParts);
  for (let part = 0; part < idatParts; part += 1) {
    const slice = compressed.subarray(part * partSize, (part + 1) * partSize);
    idatChunks.push(...chunkV1("IDAT", [...slice]));
  }
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunkV1("IHDR", [
      ...u32V1(input.width),
      ...u32V1(input.height),
      bitDepth,
      input.colorType,
      0,
      0,
      input.interlace ?? 0,
    ]),
    ...(input.transparency === undefined ? [] : chunkV1("tRNS", [...input.transparency])),
    ...idatChunks,
    ...chunkV1("IEND", []),
  ]);
}

/** RGBA pixels where each pixel's alpha comes from the given grid. */
function rgbaFromAlphaV1(alpha: readonly number[]): Uint8Array {
  const pixels = new Uint8Array(alpha.length * 4);
  alpha.forEach((value, index) => {
    pixels[index * 4] = 10;
    pixels[index * 4 + 1] = 20;
    pixels[index * 4 + 2] = 30;
    pixels[index * 4 + 3] = value;
  });
  return pixels;
}

describe("decodePngAlphaV1", () => {
  it("decodes the alpha plane of an 8-bit RGBA image", async () => {
    const alpha = [0, 64, 128, 192, 255, 7];
    const png = await encodePngV1({
      width: 3,
      height: 2,
      colorType: 6,
      pixels: rgbaFromAlphaV1(alpha),
    });
    const image = await decodePngAlphaV1(png);
    expect(image.width).toBe(3);
    expect(image.height).toBe(2);
    expect([...image.alpha]).toEqual(alpha);
  });

  it("reverses every scanline filter and joins split IDAT chunks", async () => {
    const alpha = Array.from({ length: 20 }, (_, index) => (index * 37) % 256);
    const png = await encodePngV1({
      width: 4,
      height: 5,
      colorType: 6,
      pixels: rgbaFromAlphaV1(alpha),
      filters: [0, 1, 2, 3, 4],
      idatParts: 3,
    });
    const image = await decodePngAlphaV1(png);
    expect([...image.alpha]).toEqual(alpha);
  });

  it("decodes gray+alpha and takes the high byte of 16-bit alpha", async () => {
    const grayAlpha = await encodePngV1({
      width: 2,
      height: 1,
      colorType: 4,
      pixels: new Uint8Array([100, 5, 200, 250]),
    });
    expect([...(await decodePngAlphaV1(grayAlpha)).alpha]).toEqual([5, 250]);

    const sixteen = await encodePngV1({
      width: 1,
      height: 1,
      colorType: 6,
      bitDepth: 16,
      pixels: new Uint8Array([0, 0, 0, 0, 0, 0, 0xab, 0xcd]),
    });
    expect([...(await decodePngAlphaV1(sixteen)).alpha]).toEqual([0xab]);
  });

  it("reads palette alpha from tRNS, defaulting missing entries to 255", async () => {
    const png = await encodePngV1({
      width: 3,
      height: 1,
      colorType: 3,
      pixels: new Uint8Array([0, 1, 2]),
      transparency: [0, 130],
    });
    expect([...(await decodePngAlphaV1(png)).alpha]).toEqual([0, 130, 255]);
  });

  it.each(
    [
      ["palette without tRNS", { colorType: 3, pixels: new Uint8Array([0]) }, "alpha_missing"],
      [
        "opaque truecolor",
        { colorType: 2, pixels: new Uint8Array([1, 2, 3]) },
        "alpha_missing",
      ],
      [
        "interlaced image",
        { colorType: 6, pixels: rgbaFromAlphaV1([9]), interlace: 1 },
        "interlace_unsupported",
      ],
    ] as const,
  )("rejects %s with a structured reason", async (_name, overrides, reason) => {
    const png = await encodePngV1({ width: 1, height: 1, ...overrides });
    await expect(decodePngAlphaV1(png)).rejects.toMatchObject({
      diagnostics: [{ code: "regions.trace_image_invalid", details: { reason } }],
    });
  });

  it("rejects non-PNG bytes, truncated chunks, and short image data", async () => {
    await expect(decodePngAlphaV1(new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
      diagnostics: [{ details: { reason: "signature_invalid" } }],
    });

    const valid = await encodePngV1({
      width: 1,
      height: 1,
      colorType: 6,
      pixels: rgbaFromAlphaV1([1]),
    });
    await expect(decodePngAlphaV1(valid.subarray(0, valid.length - 8))).rejects.toMatchObject({
      diagnostics: [{ details: { reason: "chunk_truncated" } }],
    });

    // Header claims 2 rows but the stream carries 1: exact-length admission.
    const short = await encodePngV1({
      width: 1,
      height: 1,
      colorType: 6,
      pixels: rgbaFromAlphaV1([1]),
    });
    const lied = new Uint8Array(short);
    lied[8 + 4 + 4 + 7] = 2; // IHDR height low byte
    await expect(decodePngAlphaV1(lied)).rejects.toMatchObject({
      diagnostics: [{ details: { reason: "idat_length_mismatch" } }],
    });
  });

  it("rejects out-of-range dimensions before touching image data", async () => {
    const png = await encodePngV1({
      width: 1,
      height: 1,
      colorType: 6,
      pixels: rgbaFromAlphaV1([1]),
    });
    const huge = new Uint8Array(png);
    huge.set([0x7f, 0xff, 0xff, 0xff], 16); // IHDR width
    await expect(decodePngAlphaV1(huge)).rejects.toMatchObject({
      diagnostics: [{ details: { reason: "dimensions_unsupported" } }],
    });
  });
});
