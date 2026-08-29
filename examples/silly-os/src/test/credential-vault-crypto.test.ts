// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  credentialVaultKdfIterationsV2,
  type CredentialVaultBindingV2,
} from "../credential/credential-vault-contracts.ts";
import {
  createCredentialVaultCryptoV2,
  credentialVaultAesGcmIvBytesV2,
  credentialVaultGenerationTokenBytesV2,
  credentialVaultSaltBytesV2,
} from "../credential/credential-vault-crypto.ts";

const bindingV2: CredentialVaultBindingV2 = {
  bindingId: "builtin.openai",
  credentialKind: "api_key",
  baseUrl: "https://api.openai.com/v1",
};

describe("Credential Vault Web Crypto V2", () => {
  it("generates a non-extractable device key", async () => {
    const vaultCrypto = createCredentialVaultCryptoV2(crypto);
    const key = await vaultCrypto.generateDeviceKey();
    expect(key).toMatchObject({
      type: "secret",
      extractable: false,
      algorithm: { name: "AES-GCM", length: 256 },
    });
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toBeInstanceOf(DOMException);
  });

  it("generates bounded independent header generation tokens", () => {
    const vaultCrypto = createCredentialVaultCryptoV2(crypto);
    const first = vaultCrypto.randomGenerationToken();
    const second = vaultCrypto.randomGenerationToken();
    expect(first).toMatch(
      new RegExp(
        `^[0-9a-f]{${String(credentialVaultGenerationTokenBytesV2 * 2)}}$`,
        "u",
      ),
    );
    expect(second).not.toBe(first);
  });

  it("measures the fixed 600k PBKDF2 candidate and returns a non-extractable AES-256 key", async () => {
    const vaultCrypto = createCredentialVaultCryptoV2(crypto);
    const salt = vaultCrypto.randomSalt();
    expect(salt.byteLength).toBe(credentialVaultSaltBytesV2);
    const started = performance.now();
    const key = await vaultCrypto.deriveKey("local vault passphrase", salt);
    const elapsedMilliseconds = performance.now() - started;
    console.info(
      `Credential Vault PBKDF2 candidate: ${String(credentialVaultKdfIterationsV2)} iterations in ${
        elapsedMilliseconds.toFixed(1)
      } ms`,
    );
    expect(credentialVaultKdfIterationsV2).toBe(600_000);
    expect(elapsedMilliseconds).toBeGreaterThan(0);
    expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toBeInstanceOf(DOMException);
  });

  it("encrypts the verifier and rejects a wrong passphrase", async () => {
    const vaultCrypto = createCredentialVaultCryptoV2(crypto);
    const salt = vaultCrypto.randomSalt();
    const correct = await vaultCrypto.deriveKey("correct passphrase", salt);
    const wrong = await vaultCrypto.deriveKey("wrong passphrase", salt);
    const verifier = await vaultCrypto.encryptVerifier(correct);
    expect(verifier.iv.byteLength).toBe(credentialVaultAesGcmIvBytesV2);
    expect(new TextDecoder().decode(verifier.ciphertext)).not.toContain("verifier");
    await expect(vaultCrypto.verifyKey(correct, verifier)).resolves.toBe(true);
    await expect(vaultCrypto.verifyKey(wrong, verifier)).resolves.toBe(false);
  });

  it("uses independent record IVs and binds ciphertext to the complete endpoint identity", async () => {
    const vaultCrypto = createCredentialVaultCryptoV2(crypto);
    const key = await vaultCrypto.deriveKey("correct passphrase", vaultCrypto.randomSalt());
    const first = await vaultCrypto.encryptCredential(key, bindingV2, "provider-secret");
    const second = await vaultCrypto.encryptCredential(key, bindingV2, "provider-secret");
    expect([...new Uint8Array(first.iv)]).not.toEqual([...new Uint8Array(second.iv)]);
    await expect(vaultCrypto.decryptCredential(key, bindingV2, first)).resolves.toBe(
      "provider-secret",
    );
    await expect(vaultCrypto.decryptCredential(key, {
      ...bindingV2,
      baseUrl: "https://api.openai.com/v2",
    }, first)).rejects.toBeInstanceOf(DOMException);
  });
});
