// SPDX-License-Identifier: MIT
import type { RuntimeSchemaV1 } from "./values.ts";
import { compareUtf16CodeUnitsInternalV1 } from "../internal/utf16-code-unit-order.ts";

/**
 * The content database: Story-defined static data tables with typed
 * queries. Content is authoring-time data — validated at definition,
 * treated as read-only typed data at runtime, and part of Story identity through
 * the ordinary source-digest path. Mutable game state never lives here;
 * it belongs to gameplay modules (atomic commits, Saves, rollback).
 *
 * "Prisma-style" describes the query surface only: typed, discoverable
 * `findMany`/`findFirst`/`byId`. There is no SQL, no async, no runtime
 * mutation, and no external database engine.
 */

export interface ContentTableDefinitionV1<TRow extends Readonly<Record<string, unknown>>> {
  readonly tableId: string;
  /** The primary-key column; values must be unique non-empty strings. */
  readonly primaryKey: keyof TRow & string;
  /** Columns whose values are textIds; catalogs can be joined in tests. */
  readonly textColumns: readonly (keyof TRow & string)[];
  /** Cross-table references: column values must be primary keys of `tableId`. */
  readonly references: readonly {
    readonly column: keyof TRow & string;
    readonly tableId: string;
  }[];
  readonly rows: readonly TRow[];
}

export class ContentDatabaseErrorV1 extends TypeError {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string) {
    super(`${code} at ${path}`);
    this.name = "ContentDatabaseErrorV1";
    this.code = code;
    this.path = path;
  }
}

const tableIdPatternV1 = /^table\.[a-z0-9_.-]+$/u;

function fail(code: string, path: string): never {
  throw new ContentDatabaseErrorV1(code, path);
}

/**
 * Defines one validated content table. The row schema is the same
 * RuntimeSchema contract modules use for state (Stories usually derive it
 * from zod via `fromStandardSchemaV1`); every row must parse, and primary
 * keys must be unique non-empty strings.
 */
export function defineContentTableV1<TRow extends Readonly<Record<string, unknown>>>(input: {
  readonly tableId: string;
  readonly schema: RuntimeSchemaV1<TRow>;
  readonly primaryKey: keyof TRow & string;
  readonly textColumns?: readonly (keyof TRow & string)[];
  readonly references?: readonly {
    readonly column: keyof TRow & string;
    readonly tableId: string;
  }[];
  readonly rows: readonly unknown[];
}): ContentTableDefinitionV1<TRow> {
  if (!tableIdPatternV1.test(input.tableId)) {
    fail("content.table_id_invalid", `/${input.tableId}`);
  }
  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    fail("content.rows_empty", `/${input.tableId}/rows`);
  }
  const seen = new Set<string>();
  const rows = input.rows.map((candidate, index) => {
    const path = `/${input.tableId}/rows/${String(index)}`;
    let row: TRow;
    try {
      row = input.schema.parse(candidate);
    } catch (error) {
      throw new ContentDatabaseErrorV1(
        `content.row_invalid: ${error instanceof Error ? error.message : String(error)}`,
        path,
      );
    }
    const key = row[input.primaryKey];
    if (typeof key !== "string" || key === "") {
      fail("content.primary_key_invalid", `${path}/${input.primaryKey}`);
    }
    if (seen.has(key)) fail("content.primary_key_duplicate", `${path}/${input.primaryKey}`);
    seen.add(key);
    return row;
  });
  return {
    tableId: input.tableId,
    primaryKey: input.primaryKey,
    textColumns: [...(input.textColumns ?? [])],
    references: (input.references ?? []).map((reference) => ({ ...reference })),
    rows,
  };
}

/** Column conditions; comparison operators require number columns. */
export type ContentConditionV1<TValue> = TValue extends number ? {
    readonly eq?: TValue;
    readonly ne?: TValue;
    readonly in?: readonly TValue[];
    readonly lt?: number;
    readonly lte?: number;
    readonly gt?: number;
    readonly gte?: number;
  }
  : TValue extends readonly (infer TItem)[] ? { readonly has?: TItem }
  : { readonly eq?: TValue; readonly ne?: TValue; readonly in?: readonly TValue[] };

export type ContentWhereV1<TRow> = {
  readonly [K in keyof TRow]?: TRow[K] | ContentConditionV1<TRow[K]>;
};

export interface ContentQueryV1<TRow> {
  readonly where?: ContentWhereV1<TRow>;
  readonly orderBy?: keyof TRow & string;
  readonly direction?: "asc" | "desc";
}

export interface ContentTableViewV1<TRow extends Readonly<Record<string, unknown>>> {
  readonly tableId: string;
  rows(): readonly TRow[];
  byId(key: string): TRow | null;
  findMany(query?: ContentQueryV1<TRow>): readonly TRow[];
  findFirst(query?: ContentQueryV1<TRow>): TRow | null;
}

/** The variance-free shape `createContentDatabaseV1` accepts. */
export interface AnyContentTableDefinitionV1 {
  readonly tableId: string;
  readonly primaryKey: string;
  readonly textColumns: readonly string[];
  readonly references: readonly { readonly column: string; readonly tableId: string }[];
  readonly rows: readonly Readonly<Record<string, unknown>>[];
}

export interface ContentDatabaseV1 {
  table<TRow extends Readonly<Record<string, unknown>>>(
    definition: ContentTableDefinitionV1<TRow>,
  ): ContentTableViewV1<TRow>;
  /** Every textId referenced by declared text columns, for catalog joins. */
  collectTextIds(): readonly string[];
}

function isConditionV1(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length > 0 &&
    keys.every((key) => ["eq", "ne", "in", "lt", "lte", "gt", "gte", "has"].includes(key))
  );
}

function matchesConditionV1(cell: unknown, condition: Readonly<Record<string, unknown>>): boolean {
  if ("eq" in condition && !Object.is(cell, condition.eq)) return false;
  if ("ne" in condition && Object.is(cell, condition.ne)) return false;
  if ("in" in condition) {
    const list = condition.in;
    if (!Array.isArray(list) || !list.some((entry) => Object.is(entry, cell))) return false;
  }
  if ("has" in condition) {
    if (!Array.isArray(cell) || !cell.some((entry) => Object.is(entry, condition.has))) {
      return false;
    }
  }
  for (const operator of ["lt", "lte", "gt", "gte"] as const) {
    if (!(operator in condition)) continue;
    const bound = condition[operator];
    if (typeof cell !== "number" || typeof bound !== "number") return false;
    if (operator === "lt" && !(cell < bound)) return false;
    if (operator === "lte" && !(cell <= bound)) return false;
    if (operator === "gt" && !(cell > bound)) return false;
    if (operator === "gte" && !(cell >= bound)) return false;
  }
  return true;
}

function matchesWhereV1<TRow extends Readonly<Record<string, unknown>>>(
  row: TRow,
  where: ContentWhereV1<TRow>,
): boolean {
  for (const [column, expectation] of Object.entries(where)) {
    if (expectation === undefined) continue;
    const cell = row[column as keyof TRow];
    if (isConditionV1(expectation)) {
      if (!matchesConditionV1(cell, expectation)) return false;
      continue;
    }
    if (!Object.is(cell, expectation)) return false;
  }
  return true;
}

/**
 * Builds the read-only database over a set of tables: unique table IDs,
 * cross-table reference validation at construction, and stable typed
 * query views. Query results preserve authoring row order unless ordered.
 */
export function createContentDatabaseV1(input: {
  readonly tables: readonly AnyContentTableDefinitionV1[];
}): ContentDatabaseV1 {
  const byId = new Map<string, AnyContentTableDefinitionV1>();
  for (const table of input.tables) {
    if (byId.has(table.tableId)) fail("content.table_duplicate", `/${table.tableId}`);
    byId.set(table.tableId, table);
  }
  // Cross-table references: every referenced value must be a primary key
  // of the referenced table (or null for optional links).
  for (const table of input.tables) {
    for (const reference of table.references) {
      const target = byId.get(reference.tableId);
      if (target === undefined) {
        fail("content.reference_table_missing", `/${table.tableId}/${reference.column}`);
      }
      const keys = new Set(target.rows.map((row) => row[target.primaryKey] as string));
      table.rows.forEach((row, index) => {
        const value = row[reference.column];
        if (value === null) return;
        if (typeof value !== "string" || !keys.has(value)) {
          fail(
            "content.reference_missing",
            `/${table.tableId}/rows/${String(index)}/${reference.column}`,
          );
        }
      });
    }
  }

  const views = new Map<string, ContentTableViewV1<Readonly<Record<string, unknown>>>>();
  for (const table of input.tables) {
    const index = new Map(table.rows.map((row) => [row[table.primaryKey] as string, row]));
    views.set(
      table.tableId,
      {
        tableId: table.tableId,
        rows: () => table.rows,
        byId: (key: string) => index.get(key) ?? null,
        findMany: (query: ContentQueryV1<Readonly<Record<string, unknown>>> = {}) => {
          let selected = query.where === undefined
            ? [...table.rows]
            : table.rows.filter((row) => matchesWhereV1(row, query.where ?? {}));
          const orderBy = query.orderBy;
          if (orderBy !== undefined) {
            const direction = query.direction === "desc" ? -1 : 1;
            selected = selected.toSorted((left, right) => {
              const a = left[orderBy];
              const b = right[orderBy];
              if (typeof a === "number" && typeof b === "number") {
                const comparison = a < b ? -1 : a > b ? 1 : 0;
                return comparison * direction;
              }
              return compareUtf16CodeUnitsInternalV1(String(a), String(b)) * direction;
            });
          }
          return selected;
        },
        findFirst(query: ContentQueryV1<Readonly<Record<string, unknown>>> = {}) {
          const matches = this.findMany(query);
          return matches[0] ?? null;
        },
      },
    );
  }

  return {
    table: <TRow extends Readonly<Record<string, unknown>>>(
      definition: ContentTableDefinitionV1<TRow>,
    ): ContentTableViewV1<TRow> => {
      const view = views.get(definition.tableId);
      if (view === undefined || byId.get(definition.tableId) !== (definition as unknown)) {
        fail("content.table_unregistered", `/${definition.tableId}`);
      }
      return view as unknown as ContentTableViewV1<TRow>;
    },
    collectTextIds: () =>
      [
        ...new Set(
          input.tables.flatMap((table) =>
            table.textColumns.flatMap((column) =>
              table.rows.flatMap((row) => {
                const value = row[column];
                return typeof value === "string" && value !== "" ? [value] : [];
              })
            )
          ),
        ),
      ].toSorted(),
  };
}
