// SPDX-License-Identifier: MIT

export type CanonicalJsonNumberFailureInternalV1 =
  | "number.non_finite"
  | "number.not_integer"
  | "number.unsafe_integer"
  | "number.negative_zero";

export function canonicalJsonNumberFailureInternalV1(
  value: number,
): CanonicalJsonNumberFailureInternalV1 | null {
  if (!Number.isFinite(value)) return "number.non_finite";
  if (!Number.isInteger(value)) return "number.not_integer";
  if (!Number.isSafeInteger(value)) return "number.unsafe_integer";
  // sillymaker-determinism-allow-next-line {"code":"determinism.numeric_fractional_literal","reason":"recognize and reject negative-zero input","bounds":"binary64 zero representations only","rounding":"exact Object.is sentinel comparison; value is rejected before commit","test":"engine/packages/base/src/contracts/canonical-strict-json.test.ts#preserves-the-canonical-error-for-negative-zero"}
  if (Object.is(value, -0)) return "number.negative_zero";
  return null;
}

export function compareCanonicalJsonCodePointsInternalV1(
  left: string,
  right: string,
): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

export function encodeCanonicalJsonUtf8InternalV1(value: string): Uint8Array {
  const bytes = [];
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    let codePoint = first;
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      codePoint = 0x1_0000 + ((first - 0xd800) << 10) + (second - 0xdc00);
      index += 1;
    }
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

export type CanonicalJsonStringVisitResultInternalV1 = "complete" | "invalid" | "stopped";

const hexDigitsInternalV1 = "0123456789abcdef";

function controlEscapeInternalV1(code: number): string {
  if (code === 0x08) return "\\b";
  if (code === 0x09) return "\\t";
  if (code === 0x0a) return "\\n";
  if (code === 0x0c) return "\\f";
  if (code === 0x0d) return "\\r";
  return `\\u00${hexDigitsInternalV1[(code >>> 4) & 0x0f]}${hexDigitsInternalV1[code & 0x0f]}`;
}

/**
 * Visits exact JSON string-content segments. Each current code point is
 * validated before its encoded segment is offered to the visitor.
 */
export function visitCanonicalJsonStringSegmentsInternalV1(
  value: string,
  visitor: (encodedSegment: string) => boolean,
): CanonicalJsonStringVisitResultInternalV1 {
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    let segment: string;
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || second < 0xdc00 || second > 0xdfff) {
        return "invalid";
      }
      segment = value.slice(index, index + 2);
      index += 1;
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      return "invalid";
    } else if (first === 0x22) {
      segment = '\\"';
    } else if (first === 0x5c) {
      segment = "\\\\";
    } else if (first < 0x20) {
      segment = controlEscapeInternalV1(first);
    } else {
      segment = value[index] ?? "";
    }
    if (!visitor(segment)) return "stopped";
  }
  return "complete";
}

export function encodeCanonicalJsonStringInternalV1(value: string): string | null {
  const segments: string[] = [];
  const result = visitCanonicalJsonStringSegmentsInternalV1(value, (segment) => {
    segments.push(segment);
    return true;
  });
  return result === "complete" ? `"${segments.join("")}"` : null;
}

export function defineCanonicalJsonProjectionMemberInternalV1(
  container: object,
  key: PropertyKey,
  value: unknown,
): void {
  Object.defineProperty(container, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}
