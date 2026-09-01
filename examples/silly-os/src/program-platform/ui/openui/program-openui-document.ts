// SPDX-License-Identifier: MIT

import { createParser, type ElementNode, type LibraryJSONSchema } from "@openuidev/lang-core";

import { isProgramPlatformIdentifierV1 } from "../../identifier.ts";

export interface ProgramOpenUiAdmissionBudgetsV1 {
  /** Caller-owned ceiling for the complete OpenUI Lang source. */
  readonly maximumSourceBytes: number;
  /** Caller-owned ceiling for one user-visible string or action prompt. */
  readonly maximumTextBytes: number;
  /** Caller-owned ceiling for the admitted, rendered component tree. */
  readonly maximumNodes: number;
  /** Caller-owned nesting ceiling used before recursive projection. */
  readonly maximumDepth: number;
}

type ProgramOpenUiStackGapV1 = "compact" | "regular" | "spacious";
type ProgramOpenUiTextToneV1 = "default" | "muted";
type ProgramOpenUiCalloutToneV1 = "info" | "success" | "warning" | "critical";
type ProgramOpenUiActionVariantV1 = "primary" | "secondary" | "ghost";

export type ProgramOpenUiNodeV1 =
  | {
    readonly kind: "stack";
    readonly gap: ProgramOpenUiStackGapV1;
    readonly children: readonly ProgramOpenUiNodeV1[];
  }
  | {
    readonly kind: "heading";
    readonly text: string;
    readonly level: 1 | 2 | 3;
  }
  | {
    readonly kind: "text";
    readonly text: string;
    readonly tone: ProgramOpenUiTextToneV1;
  }
  | {
    readonly kind: "callout";
    readonly text: string;
    readonly tone: ProgramOpenUiCalloutToneV1;
  }
  | {
    readonly kind: "action";
    readonly actionId: string;
    readonly label: string;
    /** Human-readable user message submitted through the ordinary Agent loop. */
    readonly prompt: string;
    readonly variant: ProgramOpenUiActionVariantV1;
  };

export interface ProgramOpenUiDocumentV1 {
  readonly schemaVersion: 1;
  readonly documentId: string;
  readonly revision: number;
  readonly root: Extract<ProgramOpenUiNodeV1, { readonly kind: "stack" }>;
}

type ProgramOpenUiDocumentRejectionV1 =
  | "budget_exceeded"
  | "dynamic_content"
  | "incomplete"
  | "invalid_document"
  | "invalid_node"
  | "orphaned_content"
  | "parser_error"
  | "unsupported_feature"
  | "unresolved_reference";

type ProgramOpenUiDocumentAdmissionV1 =
  | { readonly kind: "admitted"; readonly document: ProgramOpenUiDocumentV1 }
  | { readonly kind: "rejected"; readonly reason: ProgramOpenUiDocumentRejectionV1 };

export interface ProgramOpenUiActionIntentV1 {
  readonly schemaVersion: 1;
  readonly kind: "program_openui_action";
  readonly documentId: string;
  readonly documentRevision: number;
  readonly actionId: string;
  /** Readable transcript input; it is not a direct business operation. */
  readonly prompt: string;
}

const textEncoderV1 = new TextEncoder();

// OpenUI Lang reserves `Action(...)` for its executable action expression.
// SillyOS therefore exposes `ActionButton(...)` in source and projects it to
// the closed `action` node above. Programs never receive an executable action
// or a raw React component through this catalog.
const programOpenUiSchemaV1: LibraryJSONSchema = {
  $defs: {
    Stack: {
      properties: {
        children: { type: "array" },
        gap: { enum: ["compact", "regular", "spacious"] },
      },
      required: ["children"],
    },
    Heading: {
      properties: {
        text: { type: "string" },
        level: { enum: [1, 2, 3] },
      },
      required: ["text"],
    },
    Text: {
      properties: {
        text: { type: "string" },
        tone: { enum: ["default", "muted"] },
      },
      required: ["text"],
    },
    Callout: {
      properties: {
        text: { type: "string" },
        tone: { enum: ["info", "success", "warning", "critical"] },
      },
      required: ["text"],
    },
    ActionButton: {
      properties: {
        actionId: { type: "string" },
        label: { type: "string" },
        prompt: { type: "string" },
        variant: { enum: ["primary", "secondary", "ghost"] },
      },
      required: ["actionId", "label", "prompt"],
    },
  },
};

const programOpenUiParserV1 = createParser(programOpenUiSchemaV1, "Stack");

function positiveSafeIntegerV1(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

function validBudgetsV1(value: ProgramOpenUiAdmissionBudgetsV1): boolean {
  return positiveSafeIntegerV1(value.maximumSourceBytes) &&
    positiveSafeIntegerV1(value.maximumTextBytes) &&
    positiveSafeIntegerV1(value.maximumNodes) &&
    positiveSafeIntegerV1(value.maximumDepth);
}

function exactRecordV1(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Readonly<Record<string, unknown>>;
  const actualKeys = Object.keys(record);
  if (actualKeys.length !== keys.length || keys.some((key) => !Object.hasOwn(record, key))) {
    return null;
  }
  return record;
}

interface ProjectionContextV1 {
  readonly budgets: ProgramOpenUiAdmissionBudgetsV1;
  readonly actionIds: Set<string>;
  nodeCount: number;
  budgetExceeded: boolean;
  dynamic: boolean;
}

function admittedTextV1(value: unknown, context: ProjectionContextV1): value is string {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) return false;
  if (textEncoderV1.encode(value).byteLength > context.budgets.maximumTextBytes) {
    context.budgetExceeded = true;
    return false;
  }
  return true;
}

function projectNodeV1(
  value: unknown,
  context: ProjectionContextV1,
  depth: number,
): ProgramOpenUiNodeV1 | null {
  if (depth > context.budgets.maximumDepth) {
    context.budgetExceeded = true;
    return null;
  }
  context.nodeCount += 1;
  if (context.nodeCount > context.budgets.maximumNodes) {
    context.budgetExceeded = true;
    return null;
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const node = value as ElementNode;
  if (
    node.type !== "element" || typeof node.typeName !== "string" || node.partial ||
    node.hasDynamicProps !== false || node.props === null || typeof node.props !== "object"
  ) {
    if (node.hasDynamicProps !== false) context.dynamic = true;
    return null;
  }

  switch (node.typeName) {
    case "Stack": {
      const props = exactRecordV1(
        node.props,
        Object.hasOwn(node.props, "gap") ? ["children", "gap"] : ["children"],
      );
      if (props === null || !Array.isArray(props.children)) return null;
      const gap = props.gap ?? "regular";
      if (gap !== "compact" && gap !== "regular" && gap !== "spacious") return null;
      const children: ProgramOpenUiNodeV1[] = [];
      for (const child of props.children) {
        const projected = projectNodeV1(child, context, depth + 1);
        if (projected === null) return null;
        children.push(projected);
      }
      return { kind: "stack", gap, children };
    }
    case "Heading": {
      const props = exactRecordV1(
        node.props,
        Object.hasOwn(node.props, "level") ? ["text", "level"] : ["text"],
      );
      if (props === null || !admittedTextV1(props.text, context)) {
        return null;
      }
      const level = props.level ?? 2;
      return level === 1 || level === 2 || level === 3
        ? { kind: "heading", text: props.text, level }
        : null;
    }
    case "Text": {
      const props = exactRecordV1(
        node.props,
        Object.hasOwn(node.props, "tone") ? ["text", "tone"] : ["text"],
      );
      if (props === null || !admittedTextV1(props.text, context)) {
        return null;
      }
      const tone = props.tone ?? "default";
      return tone === "default" || tone === "muted"
        ? { kind: "text", text: props.text, tone }
        : null;
    }
    case "Callout": {
      const props = exactRecordV1(
        node.props,
        Object.hasOwn(node.props, "tone") ? ["text", "tone"] : ["text"],
      );
      if (props === null || !admittedTextV1(props.text, context)) {
        return null;
      }
      const tone = props.tone ?? "info";
      return tone === "info" || tone === "success" || tone === "warning" || tone === "critical"
        ? { kind: "callout", text: props.text, tone }
        : null;
    }
    case "ActionButton": {
      const props = exactRecordV1(
        node.props,
        Object.hasOwn(node.props, "variant")
          ? ["actionId", "label", "prompt", "variant"]
          : ["actionId", "label", "prompt"],
      );
      if (
        props === null || !isProgramPlatformIdentifierV1(props.actionId) ||
        !admittedTextV1(props.label, context) ||
        !admittedTextV1(props.prompt, context) ||
        context.actionIds.has(props.actionId)
      ) {
        return null;
      }
      const variant = props.variant ?? "secondary";
      if (variant !== "primary" && variant !== "secondary" && variant !== "ghost") return null;
      context.actionIds.add(props.actionId);
      return {
        kind: "action",
        actionId: props.actionId,
        label: props.label,
        prompt: props.prompt,
        variant,
      };
    }
    default:
      return null;
  }
}

/**
 * Admits one terminal OpenUI Lang document into SillyOS's closed component
 * model. Streaming/partial output remains inert until a complete successor is
 * available; reactive state, queries, mutations, and executable OpenUI actions
 * are deliberately outside this first product-private contract.
 */
export function admitProgramOpenUiDocumentV1(
  value: unknown,
  budgets: ProgramOpenUiAdmissionBudgetsV1,
): ProgramOpenUiDocumentAdmissionV1 {
  if (!validBudgetsV1(budgets)) throw new TypeError("sillyos.program_openui.invalid_budgets");
  const row = exactRecordV1(value, ["schemaVersion", "documentId", "revision", "source"]);
  if (
    row === null || row.schemaVersion !== 1 || !isProgramPlatformIdentifierV1(row.documentId) ||
    !Number.isSafeInteger(row.revision) || typeof row.revision !== "number" || row.revision < 0 ||
    typeof row.source !== "string" || row.source.trim().length === 0
  ) {
    return { kind: "rejected", reason: "invalid_document" };
  }
  if (textEncoderV1.encode(row.source).byteLength > budgets.maximumSourceBytes) {
    return { kind: "rejected", reason: "budget_exceeded" };
  }

  let parsed: ReturnType<typeof programOpenUiParserV1.parse>;
  try {
    parsed = programOpenUiParserV1.parse(row.source);
  } catch {
    return { kind: "rejected", reason: "parser_error" };
  }
  if (parsed.meta.incomplete || parsed.root?.partial === true) {
    return { kind: "rejected", reason: "incomplete" };
  }
  if (parsed.meta.errors.length > 0 || parsed.root === null || parsed.root.typeName !== "Stack") {
    return { kind: "rejected", reason: "parser_error" };
  }
  if (parsed.meta.unresolved.length > 0) {
    return { kind: "rejected", reason: "unresolved_reference" };
  }
  if (parsed.meta.orphaned.length > 0) {
    return { kind: "rejected", reason: "orphaned_content" };
  }
  if (parsed.root.hasDynamicProps !== false) {
    return { kind: "rejected", reason: "dynamic_content" };
  }
  if (
    Object.keys(parsed.stateDeclarations).length > 0 || parsed.queryStatements.length > 0 ||
    parsed.mutationStatements.length > 0
  ) {
    return { kind: "rejected", reason: "unsupported_feature" };
  }

  const context: ProjectionContextV1 = {
    budgets,
    actionIds: new Set(),
    nodeCount: 0,
    budgetExceeded: false,
    dynamic: false,
  };
  const root = projectNodeV1(parsed.root, context, 1);
  if (root === null || root.kind !== "stack") {
    if (context.budgetExceeded) return { kind: "rejected", reason: "budget_exceeded" };
    if (context.dynamic) return { kind: "rejected", reason: "dynamic_content" };
    return { kind: "rejected", reason: "invalid_node" };
  }
  return {
    kind: "admitted",
    document: {
      schemaVersion: 1,
      documentId: row.documentId,
      revision: row.revision,
      root,
    },
  };
}

export function createProgramOpenUiActionIntentV1(
  document: ProgramOpenUiDocumentV1,
  action: Extract<ProgramOpenUiNodeV1, { readonly kind: "action" }>,
): ProgramOpenUiActionIntentV1 {
  return {
    schemaVersion: 1,
    kind: "program_openui_action",
    documentId: document.documentId,
    documentRevision: document.revision,
    actionId: action.actionId,
    prompt: action.prompt,
  };
}
