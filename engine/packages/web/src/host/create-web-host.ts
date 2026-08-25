// SPDX-License-Identifier: MIT
import type {
  ApplicationHostCapabilitiesV1,
  HostAtomicRecordStoreV1,
  IsoUtcInstant,
} from "@sillymaker/base/host";
import { createBrowserFilePortV1 } from "./browser-file-port.ts";
import { createIndexedDbRecordStoreV1 } from "./indexeddb-record-store.ts";

interface CreateWebHostCommonOptionsV1 {
  readonly now?: () => string;
  readonly files?: ApplicationHostCapabilitiesV1["files"];
}

export type CreateWebHostOptionsV1 =
  & CreateWebHostCommonOptionsV1
  & (
    | { readonly databaseName: string; readonly records?: never }
    | { readonly databaseName?: never; readonly records: HostAtomicRecordStoreV1 }
  );

function readGlobalIndexedDbV1(): IDBFactory | undefined {
  try {
    const indexedDB = globalThis.indexedDB;
    return indexedDB !== undefined && typeof indexedDB.open === "function" ? indexedDB : undefined;
  } catch {
    return undefined;
  }
}

function resolveRecordsV1(options: CreateWebHostOptionsV1): HostAtomicRecordStoreV1 {
  const databaseName = Reflect.get(options, "databaseName") as unknown;
  const records = Reflect.get(options, "records") as unknown;
  const hasDatabaseName = databaseName !== undefined;
  const hasRecords = records !== undefined;
  if (hasDatabaseName === hasRecords) {
    throw new TypeError("Web Host requires exactly one persistence composition");
  }
  if (hasDatabaseName) {
    if (typeof databaseName !== "string") throw new TypeError("invalid Web Host databaseName");
    return createIndexedDbRecordStoreV1({
      indexedDB: readGlobalIndexedDbV1() as IDBFactory,
      databaseName,
    });
  }
  if (
    records === null ||
    typeof records !== "object" ||
    typeof Reflect.get(records, "read") !== "function" ||
    typeof Reflect.get(records, "list") !== "function" ||
    typeof Reflect.get(records, "commit") !== "function"
  ) {
    throw new TypeError("invalid Web Host record store");
  }
  return records as HostAtomicRecordStoreV1;
}

export function createWebHostV1(
  options: CreateWebHostOptionsV1,
): ApplicationHostCapabilitiesV1 {
  if (options === null || typeof options !== "object") {
    throw new TypeError("invalid Web Host options");
  }
  const records = resolveRecordsV1(options);
  const files = options.files ?? createBrowserFilePortV1();
  return ({
    records,
    files,
    metadataClock: {
      now: () => (options.now?.() ?? new Date().toISOString()) as IsoUtcInstant,
    },
    log: {
      write(
        level: "debug" | "info" | "warn" | "error",
        code: string,
        details: Parameters<ApplicationHostCapabilitiesV1["log"]["write"]>[2],
      ) {
        const method = level === "debug"
          ? console.debug
          : level === "info"
          ? console.info
          : level === "warn"
          ? console.warn
          : console.error;
        method(code, details);
      },
    },
  });
}
