// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  admitCredentialVaultBindingV1,
  credentialVaultApiKeyMaximumUtf8BytesV1,
  credentialVaultKdfIterationsV1,
  credentialVaultPassphraseMaximumUtf8BytesV1,
  credentialVaultRevisionV1,
  isCredentialVaultBoundedTextV1,
  type CredentialVaultBindingV1,
} from "./credential-vault-contracts.ts";

export const credentialVaultSaltBytesV1 = 32;
export const credentialVaultAesGcmIvBytesV1 = 12;
export const credentialVaultAesGcmTagBytesV1 = 16;

const verifierPlaintextV1 = new TextEncoder().encode("sillyos.credential-vault.verifier.v1");

export interface CredentialVaultEncryptedPayloadV1 {
  readonly iv: ArrayBuffer;
  readonly ciphertext: ArrayBuffer;
}

export interface CredentialVaultCryptoV1 {
  randomSalt(): ArrayBuffer;
  deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey>;
  encryptVerifier(key: CryptoKey): Promise<CredentialVaultEncryptedPayloadV1>;
  verifyKey(key: CryptoKey, payload: CredentialVaultEncryptedPayloadV1): Promise<boolean>;
  encryptCredential(
    key: CryptoKey,
    binding: CredentialVaultBindingV1,
    value: string,
  ): Promise<CredentialVaultEncryptedPayloadV1>;
  decryptCredential(
    key: CryptoKey,
    binding: CredentialVaultBindingV1,
    payload: CredentialVaultEncryptedPayloadV1,
  ): Promise<string>;
}

function exactArrayBufferV1(value: ArrayBuffer): ArrayBuffer {
  if (!(value instanceof ArrayBuffer)) {
    throw new TypeError("sillyos.credential_vault.buffer_invalid");
  }
  return value.slice(0);
}

function bindingAadV1(binding: CredentialVaultBindingV1): Uint8Array<ArrayBuffer> {
  const admitted = admitCredentialVaultBindingV1(binding);
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.credential_vault.binding_invalid${admitted.path}`);
  }
  return new TextEncoder().encode(JSON.stringify([
    "sillyos.credential-vault.binding",
    credentialVaultRevisionV1,
    admitted.value.bindingId,
    admitted.value.credentialKind,
    admitted.value.baseUrl,
  ]));
}

function verifierAadV1(): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify([
    "sillyos.credential-vault.verifier",
    credentialVaultRevisionV1,
  ]));
}

function admitPayloadV1(payload: CredentialVaultEncryptedPayloadV1): {
  readonly iv: ArrayBuffer;
  readonly ciphertext: ArrayBuffer;
} {
  const iv = exactArrayBufferV1(payload.iv);
  const ciphertext = exactArrayBufferV1(payload.ciphertext);
  if (
    iv.byteLength !== credentialVaultAesGcmIvBytesV1 ||
    ciphertext.byteLength < credentialVaultAesGcmTagBytesV1
  ) throw new TypeError("sillyos.credential_vault.payload_invalid");
  return { iv, ciphertext };
}

export function createCredentialVaultCryptoV1(cryptoApi: Crypto): CredentialVaultCryptoV1 {
  const randomBytesV1 = (length: number): Uint8Array<ArrayBuffer> => {
    const value = new Uint8Array(new ArrayBuffer(length));
    cryptoApi.getRandomValues(value);
    return value;
  };

  const encryptV1 = async (
    key: CryptoKey,
    plaintext: Uint8Array<ArrayBuffer>,
    additionalData: Uint8Array<ArrayBuffer>,
  ): Promise<CredentialVaultEncryptedPayloadV1> => {
    const iv = randomBytesV1(credentialVaultAesGcmIvBytesV1);
    const ciphertext = await cryptoApi.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData, tagLength: 128 },
      key,
      plaintext,
    );
    return { iv: iv.buffer, ciphertext };
  };

  const decryptV1 = async (
    key: CryptoKey,
    payload: CredentialVaultEncryptedPayloadV1,
    additionalData: Uint8Array<ArrayBuffer>,
  ): Promise<ArrayBuffer> => {
    const admitted = admitPayloadV1(payload);
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
      return randomBytesV1(credentialVaultSaltBytesV1).buffer;
    },
    async deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
      if (
        !isCredentialVaultBoundedTextV1(
          passphrase,
          credentialVaultPassphraseMaximumUtf8BytesV1,
        )
      ) throw new TypeError("sillyos.credential_vault.passphrase_invalid");
      const saltCopy = exactArrayBufferV1(salt);
      if (saltCopy.byteLength !== credentialVaultSaltBytesV1) {
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
            iterations: credentialVaultKdfIterationsV1,
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
    async encryptVerifier(key: CryptoKey): Promise<CredentialVaultEncryptedPayloadV1> {
      return await encryptV1(key, verifierPlaintextV1, verifierAadV1());
    },
    async verifyKey(
      key: CryptoKey,
      payload: CredentialVaultEncryptedPayloadV1,
    ): Promise<boolean> {
      try {
        const plaintext = new Uint8Array(await decryptV1(key, payload, verifierAadV1()));
        if (plaintext.byteLength !== verifierPlaintextV1.byteLength) {
          plaintext.fill(0);
          return false;
        }
        let different = 0;
        for (let index = 0; index < plaintext.byteLength; index += 1) {
          different |= (plaintext[index] ?? 0) ^ (verifierPlaintextV1[index] ?? 0);
        }
        plaintext.fill(0);
        return different === 0;
      } catch {
        return false;
      }
    },
    async encryptCredential(
      key: CryptoKey,
      binding: CredentialVaultBindingV1,
      value: string,
    ): Promise<CredentialVaultEncryptedPayloadV1> {
      if (!isCredentialVaultBoundedTextV1(value, credentialVaultApiKeyMaximumUtf8BytesV1)) {
        throw new TypeError("sillyos.credential_vault.credential_invalid");
      }
      const plaintext = new TextEncoder().encode(value);
      try {
        return await encryptV1(key, plaintext, bindingAadV1(binding));
      } finally {
        plaintext.fill(0);
      }
    },
    async decryptCredential(
      key: CryptoKey,
      binding: CredentialVaultBindingV1,
      payload: CredentialVaultEncryptedPayloadV1,
    ): Promise<string> {
      const plaintext = new Uint8Array(await decryptV1(key, payload, bindingAadV1(binding)));
      try {
        const value = new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
        if (!isCredentialVaultBoundedTextV1(value, credentialVaultApiKeyMaximumUtf8BytesV1)) {
          throw new TypeError("sillyos.credential_vault.credential_invalid");
        }
        return value;
      } finally {
        plaintext.fill(0);
      }
    },
  });
}
