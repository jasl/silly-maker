// SPDX-License-Identifier: MIT

export interface ZipCentralDirectoryEntryV1 {
  readonly name: string;
  readonly compressionMethod: number;
  readonly modificationTime: number;
  readonly modificationDate: number;
  readonly bytes: Uint8Array;
}

export function readZipCentralDirectoryV1(
  bytes: Uint8Array,
): readonly ZipCentralDirectoryEntryV1[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOfCentralDirectorySignature = 0x06054b50;
  const centralDirectoryEntrySignature = 0x02014b50;
  const localEntrySignature = 0x04034b50;
  const minimumEndRecordBytes = 22;
  const maximumCommentBytes = 0xffff;
  let endOffset = -1;
  const earliest = Math.max(0, bytes.byteLength - minimumEndRecordBytes - maximumCommentBytes);
  for (
    let offset = bytes.byteLength - minimumEndRecordBytes;
    offset >= earliest;
    offset -= 1
  ) {
    if (
      view.getUint32(offset, true) === endOfCentralDirectorySignature &&
      offset + minimumEndRecordBytes + view.getUint16(offset + 20, true) === bytes.byteLength
    ) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error("Downloaded workspace ZIP has no exact end record");
  if (
    view.getUint16(endOffset + 4, true) !== 0 ||
    view.getUint16(endOffset + 6, true) !== 0
  ) throw new Error("Downloaded workspace ZIP unexpectedly spans multiple disks");
  const entriesOnDisk = view.getUint16(endOffset + 8, true);
  const entryCount = view.getUint16(endOffset + 10, true);
  const directoryBytes = view.getUint32(endOffset + 12, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);
  if (
    entriesOnDisk !== entryCount || directoryOffset + directoryBytes !== endOffset
  ) throw new Error("Downloaded workspace ZIP has an invalid central-directory extent");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries: ZipCentralDirectoryEntryV1[] = [];
  let offset = directoryOffset;
  let previousLocalOffset = -1;
  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + 46 > endOffset ||
      view.getUint32(offset, true) !== centralDirectoryEntrySignature
    ) throw new Error("Downloaded workspace ZIP has an invalid central-directory entry");
    const nameBytes = view.getUint16(offset + 28, true);
    const extraBytes = view.getUint16(offset + 30, true);
    const commentBytes = view.getUint16(offset + 32, true);
    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedBytes = view.getUint32(offset + 20, true);
    const uncompressedBytes = view.getUint32(offset + 24, true);
    const localOffset = view.getUint32(offset + 42, true);
    const nextOffset = offset + 46 + nameBytes + extraBytes + commentBytes;
    if (
      nameBytes === 0 || nextOffset > endOffset || compressionMethod !== 0 ||
      compressedBytes !== uncompressedBytes || localOffset <= previousLocalOffset ||
      localOffset + 30 > directoryOffset ||
      view.getUint32(localOffset, true) !== localEntrySignature ||
      view.getUint16(localOffset + 8, true) !== compressionMethod
    ) {
      throw new Error("Downloaded workspace ZIP has invalid entry metadata");
    }
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameBytes));
    const localNameBytes = view.getUint16(localOffset + 26, true);
    const localExtraBytes = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameBytes + localExtraBytes;
    const dataEnd = dataOffset + compressedBytes;
    if (
      dataEnd > directoryOffset ||
      decoder.decode(bytes.subarray(localOffset + 30, localOffset + 30 + localNameBytes)) !== name
    ) throw new Error("Downloaded workspace ZIP has an invalid local entry");
    entries.push({
      name,
      compressionMethod,
      modificationTime: view.getUint16(offset + 12, true),
      modificationDate: view.getUint16(offset + 14, true),
      bytes: bytes.subarray(dataOffset, dataEnd),
    });
    previousLocalOffset = localOffset;
    offset = nextOffset;
  }
  if (offset !== endOffset) {
    throw new Error("Downloaded workspace ZIP has trailing central-directory metadata");
  }
  return entries;
}
