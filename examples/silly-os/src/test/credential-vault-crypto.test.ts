// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  credentialVaultKdfIterationsV1,
  type CredentialVaultBindingV1,
} from "../credential/credential-vault-contracts.ts";
import {
  createCredentialVaultCryptoV1,
  credentialVaultAesGcmIvBytesV1,
  credentialVaultSaltBytesV1,
} from "../credential/credential-vault-crypto.ts";

const bindingV1: CredentialVaultBindingV1 = {
  bindingId: "builtin.openai",
  credentialKind: "api_key",
  baseUrl: "https://api.openai.com/v1",
};

describe("Credential Vault Web Crypto V1", () => {
  it("measures the fixed 600k PBKDF2 candidate and returns a non-extractable AES-256 key", async () => {
    const vaultCrypto = createCredentialVaultCryptoV1(crypto);
    const salt = vaultCrypto.randomSalt();
    expect(salt.byteLength).toBe(credentialVaultSaltBytesV1);
    const started = performance.now();
    const key = await vaultCrypto.deriveKey("local vault passphrase", salt);
    const elapsedMilliseconds = performance.now() - started;
    console.info(
      `Credential Vault PBKDF2 candidate: ${String(credentialVaultKdfIterationsV1)} iterations in ${
        elapsedMilliseconds.toFixed(1)
      } ms`,
    );
    expect(credentialVaultKdfIterationsV1).toBe(600_000);
    expect(elapsedMilliseconds).toBeGreaterThan(0);
    expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toBeInstanceOf(DOMException);
  });

  it("encrypts the verifier and rejects a wrong passphrase", async () => {
    const vaultCrypto = createCredentialVaultCryptoV1(crypto);
    const salt = vaultCrypto.randomSalt();
    const correct = await vaultCrypto.deriveKey("correct passphrase", salt);
    const wrong = await vaultCrypto.deriveKey("wrong passphrase", salt);
    const verifier = await vaultCrypto.encryptVerifier(correct);
    expect(verifier.iv.byteLength).toBe(credentialVaultAesGcmIvBytesV1);
    expect(new TextDecoder().decode(verifier.ciphertext)).not.toContain("verifier");
    await expect(vaultCrypto.verifyKey(correct, verifier)).resolves.toBe(true);
    await expect(vaultCrypto.verifyKey(wrong, verifier)).resolves.toBe(false);
  });

  it("uses independent record IVs and binds ciphertext to the complete endpoint identity", async () => {
    const vaultCrypto = createCredentialVaultCryptoV1(crypto);
    const key = await vaultCrypto.deriveKey("correct passphrase", vaultCrypto.randomSalt());
    const first = await vaultCrypto.encryptCredential(key, bindingV1, "provider-secret");
    const second = await vaultCrypto.encryptCredential(key, bindingV1, "provider-secret");
    expect([...new Uint8Array(first.iv)]).not.toEqual([...new Uint8Array(second.iv)]);
    await expect(vaultCrypto.decryptCredential(key, bindingV1, first)).resolves.toBe(
      "provider-secret",
    );
    await expect(vaultCrypto.decryptCredential(key, {
      ...bindingV1,
      baseUrl: "https://api.openai.com/v2",
    }, first)).rejects.toBeInstanceOf(DOMException);
  });
});
