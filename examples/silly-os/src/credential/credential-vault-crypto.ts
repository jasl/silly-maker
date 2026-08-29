// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  admitCredentialVaultBindingV2,
  credentialVaultApiKeyMaximumUtf8BytesV2,
  credentialVaultKdfIterationsV2,
  credentialVaultPassphraseMaximumUtf8BytesV2,
  credentialVaultRevisionV2,
  isCredentialVaultBoundedTextV2,
  type CredentialVaultBindingV2,
} from "./credential-vault-contracts.ts";

export const credentialVaultSaltBytesV2 = 32;
export const credentialVaultAesGcmIvBytesV2 = 12;
export const credentialVaultAesGcmTagBytesV2 = 16;
export const credentialVaultGenerationTokenBytesV2 = 16;

const verifierPlaintextV2 = new TextEncoder().encode("sillyos.credential-vault.verifier.v2");

export interface CredentialVaultEncryptedPayloadV2 {
  readonly iv: ArrayBuffer;
  readonly ciphertext: ArrayBuffer;
}

export interface CredentialVaultCryptoV2 {
  randomSalt(): ArrayBuffer;
  randomGenerationToken(): string;
  generateDeviceKey(): Promise<CryptoKey>;
  deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey>;
  encryptVerifier(key: CryptoKey): Promise<CredentialVaultEncryptedPayloadV2>;
  verifyKey(key: CryptoKey, payload: CredentialVaultEncryptedPayloadV2): Promise<boolean>;
  encryptCredential(
    key: CryptoKey,
    binding: CredentialVaultBindingV2,
    value: string,
  ): Promise<CredentialVaultEncryptedPayloadV2>;
  decryptCredential(
    key: CryptoKey,
    binding: CredentialVaultBindingV2,
    payload: CredentialVaultEncryptedPayloadV2,
  ): Promise<string>;
}

function exactArrayBufferV2(value: ArrayBuffer): ArrayBuffer {
  if (!(value instanceof ArrayBuffer)) {
    throw new TypeError("sillyos.credential_vault.buffer_invalid");
  }
  return value.slice(0);
}

export function isCredentialVaultDeviceKeyV2(value: unknown): value is CryptoKey {
  if (value === null || typeof value !== "object") return false;
  try {
    const key = value as CryptoKey;
    const algorithm = key.algorithm as Readonly<AesKeyAlgorithm>;
    return key.type === "secret" && !key.extractable &&
      algorithm?.name === "AES-GCM" && algorithm.length === 256 &&
      key.usages.length === 2 && key.usages.includes("encrypt") && key.usages.includes("decrypt");
  } catch {
    return false;
  }
}

function bindingAadV2(binding: CredentialVaultBindingV2): Uint8Array<ArrayBuffer> {
  const admitted = admitCredentialVaultBindingV2(binding);
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.credential_vault.binding_invalid${admitted.path}`);
  }
  return new TextEncoder().encode(JSON.stringify([
    "sillyos.credential-vault.binding",
    credentialVaultRevisionV2,
    admitted.value.bindingId,
    admitted.value.credentialKind,
    admitted.value.baseUrl,
  ]));
}

function verifierAadV2(): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify([
    "sillyos.credential-vault.verifier",
    credentialVaultRevisionV2,
  ]));
}

function admitPayloadV2(payload: CredentialVaultEncryptedPayloadV2): {
  readonly iv: ArrayBuffer;
  readonly ciphertext: ArrayBuffer;
} {
  const iv = exactArrayBufferV2(payload.iv);
  const ciphertext = exactArrayBufferV2(payload.ciphertext);
  if (
    iv.byteLength !== credentialVaultAesGcmIvBytesV2 ||
    ciphertext.byteLength < credentialVaultAesGcmTagBytesV2
  ) throw new TypeError("sillyos.credential_vault.payload_invalid");
  return { iv, ciphertext };
}

export function createCredentialVaultCryptoV2(cryptoApi: Crypto): CredentialVaultCryptoV2 {
  const randomBytesV2 = (length: number): Uint8Array<ArrayBuffer> => {
    const value = new Uint8Array(new ArrayBuffer(length));
    cryptoApi.getRandomValues(value);
    return value;
  };

  const encryptV2 = async (
    key: CryptoKey,
    plaintext: Uint8Array<ArrayBuffer>,
    additionalData: Uint8Array<ArrayBuffer>,
  ): Promise<CredentialVaultEncryptedPayloadV2> => {
    const iv = randomBytesV2(credentialVaultAesGcmIvBytesV2);
    const ciphertext = await cryptoApi.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData, tagLength: 128 },
      key,
      plaintext,
    );
    return { iv: iv.buffer, ciphertext };
  };

  const decryptV2 = async (
    key: CryptoKey,
    payload: CredentialVaultEncryptedPayloadV2,
    additionalData: Uint8Array<ArrayBuffer>,
  ): Promise<ArrayBuffer> => {
    const admitted = admitPayloadV2(payload);
    return await cryptoApi.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(admitted.iv),
        additionalData,
        tagLength: 128,
      },
      key,
      admitted.ciphertext,
    );
  };

  return Object.freeze({
    randomSalt(): ArrayBuffer {
      return randomBytesV2(credentialVaultSaltBytesV2).buffer;
    },
    randomGenerationToken(): string {
      return [...randomBytesV2(credentialVaultGenerationTokenBytesV2)]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
    },
    async generateDeviceKey(): Promise<CryptoKey> {
      const key = await cryptoApi.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
      if (!isCredentialVaultDeviceKeyV2(key)) {
        throw new TypeError("sillyos.credential_vault.device_key_invalid");
      }
      return key;
    },
    async deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
      if (
        !isCredentialVaultBoundedTextV2(
          passphrase,
          credentialVaultPassphraseMaximumUtf8BytesV2,
        )
      ) throw new TypeError("sillyos.credential_vault.passphrase_invalid");
      const saltCopy = exactArrayBufferV2(salt);
      if (saltCopy.byteLength !== credentialVaultSaltBytesV2) {
        throw new TypeError("sillyos.credential_vault.salt_invalid");
      }
      const passphraseBytes = new TextEncoder().encode(passphrase);
      try {
        const material = await cryptoApi.subtle.importKey(
          "raw",
          passphraseBytes,
          "PBKDF2",
          false,
          ["deriveKey"],
        );
        return await cryptoApi.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: new Uint8Array(saltCopy),
            iterations: credentialVaultKdfIterationsV2,
            hash: "SHA-256",
          },
          material,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"],
        );
      } finally {
        passphraseBytes.fill(0);
      }
    },
    async encryptVerifier(key: CryptoKey): Promise<CredentialVaultEncryptedPayloadV2> {
      return await encryptV2(key, verifierPlaintextV2, verifierAadV2());
    },
    async verifyKey(
      key: CryptoKey,
      payload: CredentialVaultEncryptedPayloadV2,
    ): Promise<boolean> {
      try {
        const plaintext = new Uint8Array(await decryptV2(key, payload, verifierAadV2()));
        if (plaintext.byteLength !== verifierPlaintextV2.byteLength) {
          plaintext.fill(0);
          return false;
        }
        let different = 0;
        for (let index = 0; index < plaintext.byteLength; index += 1) {
          different |= (plaintext[index] ?? 0) ^ (verifierPlaintextV2[index] ?? 0);
        }
        plaintext.fill(0);
        return different === 0;
      } catch {
        return false;
      }
    },
    async encryptCredential(
      key: CryptoKey,
      binding: CredentialVaultBindingV2,
      value: string,
    ): Promise<CredentialVaultEncryptedPayloadV2> {
      if (!isCredentialVaultBoundedTextV2(value, credentialVaultApiKeyMaximumUtf8BytesV2)) {
        throw new TypeError("sillyos.credential_vault.credential_invalid");
      }
      const plaintext = new TextEncoder().encode(value);
      try {
        return await encryptV2(key, plaintext, bindingAadV2(binding));
      } finally {
        plaintext.fill(0);
      }
    },
    async decryptCredential(
      key: CryptoKey,
      binding: CredentialVaultBindingV2,
      payload: CredentialVaultEncryptedPayloadV2,
    ): Promise<string> {
      const plaintext = new Uint8Array(await decryptV2(key, payload, bindingAadV2(binding)));
      try {
        const value = new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
        if (!isCredentialVaultBoundedTextV2(value, credentialVaultApiKeyMaximumUtf8BytesV2)) {
          throw new TypeError("sillyos.credential_vault.credential_invalid");
        }
        return value;
      } finally {
        plaintext.fill(0);
      }
    },
  });
}
