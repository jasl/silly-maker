// SPDX-License-Identifier: MIT
import type { Digest } from "../contracts/values.ts";

export interface RngZeroStateByteOracleV1 {
  readonly byteLength: number;
  readonly bytesDigest: Digest;
  readonly bytesBase64: string;
}

// Captured before DET1 changed RNG admission. These are intentionally raw,
// correctly digested inputs: green tests must never regenerate them through the
// post-DET1 schema or encoder.
const zeroStateSaveBase64V1 = [
  "eyJmb3JtYXRSZXZpc2lvbiI6MSwicHJvdmVuYW5jZSI6eyJlbmdpbmUiOnsiZGlnZXN0Ijoic2hhMjU2OjAyOGY4NWI4YmI5YmVi",
  "NWI5ZWZkNDZkM2I3Y2UyODdlYzVjYTcyNjM4MWEyMWY1ZmJiNjI4NjUxMjY3ZTM3ZjAiLCJ2ZXJzaW9uIjoiU2lsbHlNYWtlciBz",
  "eW50aGV0aWMtdGVzdCJ9LCJyZXNvbHZlZCI6eyJwYXRjaFNldCI6eyJhcHBsaWVkSG90Zml4ZXMiOltdLCJkaWdlc3QiOiJzaGEy",
  "NTY6MDc1ZTRhMzc1MzMxOTM0MWY5Nzc3NTZiNzg2YjM0MjMwMzhiNjYxMGM3YzJjZjU3ZGY1MWQzZGVkNTcwMTk4OCIsInByZXNl",
  "bnRhdGlvbkRpZ2VzdCI6InNoYTI1NjowNzVlNGEzNzUzMzE5MzQxZjk3Nzc1NmI3ODZiMzQyMzAzOGI2NjEwYzdjMmNmNTdkZjUx",
  "ZDNkZWQ1NzAxOTg4Iiwic2ltdWxhdGlvbkRpZ2VzdCI6InNoYTI1NjowNzVlNGEzNzUzMzE5MzQxZjk3Nzc1NmI3ODZiMzQyMzAz",
  "OGI2NjEwYzdjMmNmNTdkZjUxZDNkZWQ1NzAxOTg4In0sInByZXNlbnRhdGlvbkRpZ2VzdCI6InNoYTI1NjpkNWU0ZGM4MGMxZTAy",
  "MTA4NjNjODk2NDYwMjE2ZDNiNGE3MTFmZDg4NDUzNWRjMGVmNzkyNDgzYWY3ZWNiNTFlIiwic2ltdWxhdGlvbkRpZ2VzdCI6InNo",
  "YTI1NjpjODQyNGE5ODA4ZDQyZWU1MjFmZWEwNDUzMTc3MTZhMWViNTlkNGE0MzJhNGQyYzQ4YzJhNzgxYzMyODQ5YmRlIiwic3Rh",
  "dGVDb250cmFjdERpZ2VzdCI6InNoYTI1NjozMTE5MjFmZmIyYzQ2NzQyZTEyNjg4YjJhMjVlZWU0ZTlkOGZlNzg5MjhmZDI0MDI5",
  "NmQ4ZjUzNjhhMjY1N2Q0Iiwic3RhdGVDb250cmFjdFJldmlzaW9uIjoxfSwic3RvcnkiOnsiZGlnZXN0Ijoic2hhMjU2OjQ0MDhi",
  "OGI4M2MwMTJjOWFkODg4ZTFmYTNiNGI0Nzg1YTA0NDkwODUzOTZjNTk0YTc5NTRjYmYzN2QxZGI2NzYiLCJpZCI6InN0b3J5LnN5",
  "bnRoZXRpYy1jb3VudGVyIiwicmV2aXNpb24iOjF9fSwicmVjb3JkUmV2aXNpb24iOjEsInNhdmVkQXQiOiIyMDI2LTA3LTIwVDAw",
  "OjAwOjAwLjAwMFoiLCJzaW11bGF0aW9uTGluZWFnZSI6W10sInNsb3QiOnsiY2FwdHVyZWRDb21tYW5kU2VxdWVuY2UiOjAsInNs",
  "b3RJZCI6ImF1dG8uY3VycmVudCIsInN0b3J5SWQiOiJzdG9yeS5zeW50aGV0aWMtY291bnRlciIsIndyaXRlUmVhc29uIjoiYXV0",
  "byJ9LCJzbmFwc2hvdCI6eyJjb21tYW5kU2VxdWVuY2UiOjAsImludGVncml0eSI6eyJmaXJzdE11dGF0aW9uU2VxdWVuY2UiOm51",
  "bGwsIm1vZGUiOiJub3JtYWwiLCJtdXRhdGlvbkNvdW50IjowLCJyZWFzb25zIjpbXX0sInJuZyI6eyJhbGdvcml0aG0iOiJ4b3Jz",
  "aGlmdDMyLXYxIiwiY3Vyc29yIjowLCJyYXdEcmF3Q291bnQiOjB9LCJzdGF0ZSI6eyJzaW11bGF0aW9uIjp7ImNvdW50ZXIiOnsi",
  "Y291bnQiOjB9fX19LCJzdGF0ZURpZ2VzdCI6InNoYTI1NjowYjhjZTMxZmFmNTg3NWU3ODk3ZTY1ZWE0MDIzM2QwMWU5YTQ3OTQy",
  "NDMxYjUwY2VkMjA4YzdjOTU5Mzc3MmI2In0=",
].join("");

const zeroStateSnapshotBase64V1 = [
  "eyJjb21tYW5kU2VxdWVuY2UiOjAsImludGVncml0eSI6eyJmaXJzdE11dGF0aW9uU2VxdWVuY2UiOm51bGwsIm1vZGUiOiJub3Jt",
  "YWwiLCJtdXRhdGlvbkNvdW50IjowLCJyZWFzb25zIjpbXX0sInJuZyI6eyJhbGdvcml0aG0iOiJ4b3JzaGlmdDMyLXYxIiwiY3Vy",
  "c29yIjowLCJyYXdEcmF3Q291bnQiOjB9LCJzdGF0ZSI6eyJzaW11bGF0aW9uIjp7ImNvdW50ZXIiOnsiY291bnQiOjB9fX19",
].join("");

export const rngZeroStateSaveOracleV1: RngZeroStateByteOracleV1 = {
  byteLength: 1_451,
  bytesDigest: "sha256:d9b01aa897cded19b6da68b764e1fee3dfef3d17de43c2d52c783ccdc1cdfc67" as Digest,
  bytesBase64: zeroStateSaveBase64V1,
};

export const rngZeroStateSnapshotOracleV1: RngZeroStateByteOracleV1 = {
  byteLength: 222,
  bytesDigest: "sha256:0b0cd4535b6671107295d7e0464798d6bdfba4797d0e20102878cad96d2e31fd" as Digest,
  bytesBase64: zeroStateSnapshotBase64V1,
};

function bytesFromBase64V1(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function createRngZeroStateSaveBytesV1(): Uint8Array {
  return bytesFromBase64V1(zeroStateSaveBase64V1);
}

export function createRngZeroStateSnapshotBytesV1(): Uint8Array {
  return bytesFromBase64V1(zeroStateSnapshotBase64V1);
}
