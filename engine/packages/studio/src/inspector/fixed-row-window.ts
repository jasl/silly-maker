// SPDX-License-Identifier: MIT

export interface FixedRowWindowInputV1 {
  readonly totalRows: number;
  readonly rowHeight: number;
  readonly viewportHeight: number;
  readonly scrollTop: number;
  readonly overscanRows: number;
}

export interface FixedRowWindowV1 {
  readonly start: number;
  readonly endExclusive: number;
  readonly offsetPx: number;
  readonly totalHeightPx: number;
}

export interface FixedRowRevealInputV1 {
  readonly totalRows: number;
  readonly rowIndex: number;
  readonly rowHeight: number;
  readonly viewportHeight: number;
  readonly scrollTop: number;
}

/** Computes the rendered slice for a fixed-height row list. */
export function calculateFixedRowWindowV1(
  input: FixedRowWindowInputV1,
): FixedRowWindowV1 {
  const totalHeightPx = input.totalRows * input.rowHeight;
  if (input.totalRows === 0) {
    return { start: 0, endExclusive: 0, offsetPx: 0, totalHeightPx: 0 };
  }

  const maxScrollTop = Math.max(0, totalHeightPx - input.viewportHeight);
  const scrollTop = Math.min(Math.max(0, input.scrollTop), maxScrollTop);
  const firstVisible = Math.min(input.totalRows, Math.floor(scrollTop / input.rowHeight));
  const visibleEnd = Math.min(
    input.totalRows,
    Math.ceil((scrollTop + input.viewportHeight) / input.rowHeight),
  );
  const start = input.overscanRows >= firstVisible ? 0 : firstVisible - input.overscanRows;
  const remainingRows = input.totalRows - visibleEnd;
  const endExclusive = input.overscanRows >= remainingRows
    ? input.totalRows
    : visibleEnd + input.overscanRows;

  return {
    start,
    endExclusive,
    offsetPx: start * input.rowHeight,
    totalHeightPx,
  };
}

/** Returns the smallest scroll adjustment that fully reveals one row. */
export function fixedRowRevealScrollTopV1(
  input: FixedRowRevealInputV1,
): number {
  const totalHeight = input.totalRows * input.rowHeight;
  const maxScrollTop = Math.max(0, totalHeight - input.viewportHeight);
  const current = Math.min(Math.max(0, input.scrollTop), maxScrollTop);
  const rowTop = input.rowIndex * input.rowHeight;
  const rowBottom = rowTop + input.rowHeight;
  if (rowTop < current) return rowTop;
  if (rowBottom > current + input.viewportHeight) {
    return Math.min(maxScrollTop, rowBottom - input.viewportHeight);
  }
  return current;
}
