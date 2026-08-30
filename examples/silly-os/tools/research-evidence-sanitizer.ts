// SPDX-License-Identifier: MIT

const researchEvidenceDiagnosticMaximumCharactersV1 = 2_000;

function redactResearchSecretV1(value: string, secret: string): string {
  return secret.length === 0 ? value : value.replaceAll(secret, "[redacted]");
}

export function sanitizeResearchErrorV1(error: unknown, apiKey: string): string {
  const diagnostic = error instanceof Error ? `${error.name}:${error.message}` : "unknown_error";
  return redactResearchSecretV1(diagnostic, apiKey).slice(
    0,
    researchEvidenceDiagnosticMaximumCharactersV1,
  );
}

export function sanitizeResearchProviderMessageV1(
  message: string | undefined,
  apiKey: string,
): string {
  return redactResearchSecretV1(message ?? "provider_error", apiKey).slice(
    0,
    researchEvidenceDiagnosticMaximumCharactersV1,
  );
}
