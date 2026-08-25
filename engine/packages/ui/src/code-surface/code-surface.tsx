// SPDX-License-Identifier: MIT
import { Component, lazy, Suspense, useEffect } from "react";
import type { ComponentType, LazyExoticComponent, ReactElement, ReactNode } from "react";
import type {
  GuiCompositionDocumentV1,
  GuiCompositionNodeV1,
  StrictJsonObjectV1,
} from "@sillymaker/base";

export type CodeSurfaceStateOwnerHintV1 =
  | "react_local"
  | "ui_session"
  | "external_rpc"
  | "authoritative_via_port";

export interface CodeSurfaceAuthoringPropertyV1 {
  readonly propId: string;
  readonly label: string;
  /** Describes admitted data for authoring; it is not a second props schema. */
  readonly valueKind: "string" | "number" | "boolean" | "json";
}

export interface CodeSurfaceAuthoringDescriptorV1 {
  readonly label: string;
  readonly properties: readonly CodeSurfaceAuthoringPropertyV1[];
  /** Minimal outer authoring placeholder: either opaque or with visible named slots. */
  readonly preview: "opaque" | "slots";
  readonly stateOwner: CodeSurfaceStateOwnerHintV1;
}

/** Declared behavior for authoring/inspection and component cooperation, not a sandbox. */
export interface CodeSurfacePolicyV1 {
  readonly input: "application" | "gameplay_passthrough";
  readonly nativeText: "allowed" | "none";
  readonly portal: "none" | "application_owned";
}

export type CodeSurfaceSlotsV1<TSlotId extends string> = Readonly<
  Record<TSlotId, readonly ReactNode[]>
>;

export interface CodeSurfaceViewPropsV1<
  TContext,
  TProps,
  TSlotId extends string,
> {
  readonly context: TContext;
  readonly props: TProps;
  readonly slots: CodeSurfaceSlotsV1<TSlotId>;
  readonly policy: CodeSurfacePolicyV1;
}

export interface DefineCodeSurfaceInputV1<
  TContext,
  TProps,
  TSlotId extends string,
> {
  readonly viewId: string;
  readonly slotIds: readonly TSlotId[];
  readonly admitProps: (value: StrictJsonObjectV1, path: string) => TProps;
  /** The implementation should be a literal dynamic import owned by product code. */
  readonly load: () => Promise<{
    readonly default: ComponentType<CodeSurfaceViewPropsV1<TContext, TProps, TSlotId>>;
  }>;
  /** Optional authoring hint; it is never resolved or verified by the runtime. */
  readonly source?: string;
  readonly authoring: CodeSurfaceAuthoringDescriptorV1;
  readonly policy: CodeSurfacePolicyV1;
}

type RuntimeViewPropsV1<TContext> = CodeSurfaceViewPropsV1<TContext, unknown, string>;

/** Build-known definition. Use defineCodeSurfaceV1 so typed props and slots stay paired. */
export interface CodeSurfaceDefinitionV1<TContext> {
  readonly viewId: string;
  readonly slotIds: readonly string[];
  readonly admitProps: (value: StrictJsonObjectV1, path: string) => unknown;
  readonly load: () => Promise<{ readonly default: ComponentType<RuntimeViewPropsV1<TContext>> }>;
  readonly source: string | null;
  readonly authoring: CodeSurfaceAuthoringDescriptorV1;
  readonly policy: CodeSurfacePolicyV1;
}

export type CodeSurfaceCompileErrorCodeV1 =
  | "ui.code_surface.definition_invalid"
  | "ui.code_surface.definition_duplicate"
  | "ui.code_surface.view_unknown"
  | "ui.code_surface.slot_unknown"
  | "ui.code_surface.props_invalid";

export class CodeSurfaceCompileErrorV1 extends TypeError {
  readonly code: CodeSurfaceCompileErrorCodeV1;
  readonly path: string;

  constructor(code: CodeSurfaceCompileErrorCodeV1, path: string, cause?: unknown) {
    super(`${code} at ${path || "/"}`, cause === undefined ? undefined : { cause });
    this.name = "CodeSurfaceCompileErrorV1";
    this.code = code;
    this.path = path;
  }
}

export interface CodeSurfaceFaultV1 {
  readonly compositionId: string;
  readonly nodeId: string;
  readonly viewId: string;
  readonly error: unknown;
}

export type CodeSurfaceNodeLifecyclePhaseV1 = "loading" | "mounted" | "released";

export interface CodeSurfaceNodeLifecycleEventV1 {
  readonly compositionId: string;
  readonly nodeId: string;
  readonly viewId: string;
  readonly phase: CodeSurfaceNodeLifecyclePhaseV1;
}

export interface CodeSurfaceInspectionNodeV1 {
  readonly nodeId: string;
  readonly viewId: string;
  readonly parentNodeId: string | null;
  readonly slotId: string | null;
  readonly documentPath: string;
  readonly source: string | null;
  readonly layoutDomain: "application" | "parent_slot";
  readonly outerGeometryOwner: "application" | "parent_code_surface";
  readonly authoring: CodeSurfaceAuthoringDescriptorV1;
  readonly policy: CodeSurfacePolicyV1;
}

export interface CodeSurfaceInspectionV1 {
  readonly compositionId: string;
  readonly nodes: readonly CodeSurfaceInspectionNodeV1[];
}

export interface CompiledCodeSurfaceCompositionV1<TContext> {
  readonly compositionId: string;
  readonly inspection: CodeSurfaceInspectionV1;
  /** Direct render plan; no catalog lookup or props admission occurs here. */
  render(
    context: TContext,
    reportFault?: (fault: CodeSurfaceFaultV1) => void,
    observeLifecycle?: (event: CodeSurfaceNodeLifecycleEventV1) => void,
  ): ReactElement;
}

export interface CodeSurfaceCatalogV1<TContext> {
  compile(document: GuiCompositionDocumentV1): CompiledCodeSurfaceCompositionV1<TContext>;
}

const viewIdPatternV1 = /^view\.[a-z0-9_.-]+$/u;
const slotIdPatternV1 = /^[a-z][a-z0-9_-]*$/u;
const propIdPatternV1 = /^[A-Za-z][A-Za-z0-9_.-]*$/u;

function definitionFailureV1(path: string): never {
  throw new CodeSurfaceCompileErrorV1("ui.code_surface.definition_invalid", path);
}

export function defineCodeSurfaceV1<
  TContext,
  TProps,
  const TSlotId extends string,
>(
  input: DefineCodeSurfaceInputV1<TContext, TProps, TSlotId>,
): CodeSurfaceDefinitionV1<TContext> {
  if (input.viewId.length > 96 || !viewIdPatternV1.test(input.viewId)) {
    return definitionFailureV1("/viewId");
  }
  const slotIds = [...input.slotIds];
  const seenSlots = new Set<string>();
  for (const [index, slotId] of slotIds.entries()) {
    if (
      slotId.length > 64 ||
      !slotIdPatternV1.test(slotId) ||
      seenSlots.has(slotId)
    ) {
      return definitionFailureV1(`/slotIds/${String(index)}`);
    }
    seenSlots.add(slotId);
  }
  if (input.authoring.label.trim().length === 0) {
    return definitionFailureV1("/authoring/label");
  }
  const seenProperties = new Set<string>();
  for (const [index, property] of input.authoring.properties.entries()) {
    if (
      property.propId.length > 96 ||
      !propIdPatternV1.test(property.propId) ||
      property.label.trim().length === 0 ||
      seenProperties.has(property.propId)
    ) {
      return definitionFailureV1(`/authoring/properties/${String(index)}`);
    }
    seenProperties.add(property.propId);
  }

  return {
    viewId: input.viewId,
    slotIds,
    admitProps: input.admitProps,
    async load() {
      const loaded = await input.load();
      return {
        default: loaded.default as ComponentType<RuntimeViewPropsV1<TContext>>,
      };
    },
    source: input.source ?? null,
    authoring: input.authoring,
    policy: input.policy,
  };
}

interface ResolvedCodeSurfaceDefinitionV1<TContext> extends CodeSurfaceDefinitionV1<TContext> {
  readonly component: LazyExoticComponent<ComponentType<RuntimeViewPropsV1<TContext>>>;
}

interface CompiledCodeSurfaceNodeV1<TContext> {
  readonly nodeId: string;
  readonly viewId: string;
  readonly parentNodeId: string | null;
  readonly slotId: string | null;
  readonly documentPath: string;
  readonly props: unknown;
  readonly definition: ResolvedCodeSurfaceDefinitionV1<TContext>;
  readonly slots: Readonly<Record<string, readonly CompiledCodeSurfaceNodeV1<TContext>[]>>;
}

function emitLifecycleV1(
  observe: ((event: CodeSurfaceNodeLifecycleEventV1) => void) | undefined,
  event: CodeSurfaceNodeLifecycleEventV1,
): void {
  if (observe === undefined) return;
  try {
    observe(event);
  } catch {
    // An optional diagnostic observer cannot replace the product surface.
  }
}

function CodeSurfaceNodePendingV1(props: {
  readonly event: Omit<CodeSurfaceNodeLifecycleEventV1, "phase">;
  readonly observe?: (event: CodeSurfaceNodeLifecycleEventV1) => void;
}): null {
  const { compositionId, nodeId, viewId } = props.event;
  useEffect(() => {
    emitLifecycleV1(props.observe, { compositionId, nodeId, viewId, phase: "loading" });
    return () =>
      emitLifecycleV1(props.observe, { compositionId, nodeId, viewId, phase: "released" });
  }, [compositionId, nodeId, props.observe, viewId]);
  return null;
}

function CodeSurfaceNodeMountedV1(props: {
  readonly event: Omit<CodeSurfaceNodeLifecycleEventV1, "phase">;
  readonly observe?: (event: CodeSurfaceNodeLifecycleEventV1) => void;
  readonly children: ReactNode;
}): ReactNode {
  const { compositionId, nodeId, viewId } = props.event;
  useEffect(() => {
    emitLifecycleV1(props.observe, { compositionId, nodeId, viewId, phase: "mounted" });
    return () =>
      emitLifecycleV1(props.observe, { compositionId, nodeId, viewId, phase: "released" });
  }, [compositionId, nodeId, props.observe, viewId]);
  return props.children;
}

interface CodeSurfaceNodeFaultBoundaryPropsV1 {
  readonly fault: Omit<CodeSurfaceFaultV1, "error">;
  readonly reportFault?: (fault: CodeSurfaceFaultV1) => void;
  readonly children: ReactNode;
}

interface CodeSurfaceNodeFaultBoundaryStateV1 {
  readonly failed: boolean;
}

class CodeSurfaceNodeFaultBoundaryV1 extends Component<
  CodeSurfaceNodeFaultBoundaryPropsV1,
  CodeSurfaceNodeFaultBoundaryStateV1
> {
  state: CodeSurfaceNodeFaultBoundaryStateV1 = { failed: false };

  static getDerivedStateFromError(_error: unknown): CodeSurfaceNodeFaultBoundaryStateV1 {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    try {
      this.props.reportFault?.({ ...this.props.fault, error });
    } catch {
      // Diagnostic reporting must not replace the local fault surface.
    }
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" data-code-surface-fault={this.props.fault.nodeId}>
        Code surface unavailable
      </div>
    );
  }
}

function CodeSurfaceNodeHostV1<TContext>(props: {
  readonly compositionId: string;
  readonly node: CompiledCodeSurfaceNodeV1<TContext>;
  readonly context: TContext;
  readonly reportFault?: (fault: CodeSurfaceFaultV1) => void;
  readonly observeLifecycle?: (event: CodeSurfaceNodeLifecycleEventV1) => void;
}) {
  const slots = Object.fromEntries(
    Object.entries(props.node.slots).map(([slotId, children]) => [
      slotId,
      children.map((child) => (
        <CodeSurfaceNodeHostV1
          key={`${child.nodeId}\0${child.viewId}`}
          compositionId={props.compositionId}
          node={child}
          context={props.context}
          {...(props.reportFault === undefined ? {} : { reportFault: props.reportFault })}
          {...(props.observeLifecycle === undefined
            ? {}
            : { observeLifecycle: props.observeLifecycle })}
        />
      )),
    ]),
  );
  const View = props.node.definition.component;
  const lifecycleEvent = {
    compositionId: props.compositionId,
    nodeId: props.node.nodeId,
    viewId: props.node.viewId,
  } as const;
  const view = (
    <View
      context={props.context}
      props={props.node.props}
      slots={slots}
      policy={props.node.definition.policy}
    />
  );
  return (
    <CodeSurfaceNodeFaultBoundaryV1
      fault={{
        compositionId: props.compositionId,
        nodeId: props.node.nodeId,
        viewId: props.node.viewId,
      }}
      {...(props.reportFault === undefined ? {} : { reportFault: props.reportFault })}
    >
      <Suspense
        fallback={props.observeLifecycle === undefined ? null : (
          <CodeSurfaceNodePendingV1
            event={lifecycleEvent}
            observe={props.observeLifecycle}
          />
        )}
      >
        {props.observeLifecycle === undefined ? view : (
          <CodeSurfaceNodeMountedV1
            event={lifecycleEvent}
            observe={props.observeLifecycle}
          >
            {view}
          </CodeSurfaceNodeMountedV1>
        )}
      </Suspense>
    </CodeSurfaceNodeFaultBoundaryV1>
  );
}

function compileNodeV1<TContext>(
  node: GuiCompositionNodeV1,
  path: string,
  definitions: ReadonlyMap<string, ResolvedCodeSurfaceDefinitionV1<TContext>>,
  parentNodeId: string | null,
  parentSlotId: string | null,
): CompiledCodeSurfaceNodeV1<TContext> {
  const definition = definitions.get(node.viewId);
  if (definition === undefined) {
    throw new CodeSurfaceCompileErrorV1("ui.code_surface.view_unknown", `${path}/viewId`);
  }
  const declaredSlots = new Set(definition.slotIds);
  for (const slotId of Object.keys(node.slots)) {
    if (!declaredSlots.has(slotId)) {
      throw new CodeSurfaceCompileErrorV1(
        "ui.code_surface.slot_unknown",
        `${path}/slots/${slotId}`,
      );
    }
  }
  let admittedProps: unknown;
  try {
    admittedProps = definition.admitProps(node.props, `${path}/props`);
  } catch (error) {
    throw new CodeSurfaceCompileErrorV1(
      "ui.code_surface.props_invalid",
      `${path}/props`,
      error,
    );
  }
  const slots = Object.fromEntries(
    definition.slotIds.map((slotId) => [
      slotId,
      (node.slots[slotId] ?? []).map((child, index) =>
        compileNodeV1(
          child,
          `${path}/slots/${slotId}/${String(index)}`,
          definitions,
          node.nodeId,
          slotId,
        )
      ),
    ]),
  );
  return {
    nodeId: node.nodeId,
    viewId: node.viewId,
    parentNodeId,
    slotId: parentSlotId,
    documentPath: path,
    props: admittedProps,
    definition,
    slots,
  };
}

function inspectCodeSurfaceNodesV1<TContext>(
  root: CompiledCodeSurfaceNodeV1<TContext>,
): readonly CodeSurfaceInspectionNodeV1[] {
  const nodes: CodeSurfaceInspectionNodeV1[] = [];
  const visit = (node: CompiledCodeSurfaceNodeV1<TContext>): void => {
    nodes.push({
      nodeId: node.nodeId,
      viewId: node.viewId,
      parentNodeId: node.parentNodeId,
      slotId: node.slotId,
      documentPath: node.documentPath,
      source: node.definition.source,
      layoutDomain: node.parentNodeId === null ? "application" : "parent_slot",
      outerGeometryOwner: node.parentNodeId === null ? "application" : "parent_code_surface",
      authoring: node.definition.authoring,
      policy: node.definition.policy,
    });
    for (const children of Object.values(node.slots)) {
      for (const child of children) visit(child);
    }
  };
  visit(root);
  return nodes;
}

export function defineCodeSurfaceCatalogV1<TContext>(
  definitions: readonly CodeSurfaceDefinitionV1<TContext>[],
): CodeSurfaceCatalogV1<TContext> {
  const resolved = new Map<string, ResolvedCodeSurfaceDefinitionV1<TContext>>();
  for (const definition of definitions) {
    if (resolved.has(definition.viewId)) {
      throw new CodeSurfaceCompileErrorV1(
        "ui.code_surface.definition_duplicate",
        `/definitions/${definition.viewId}`,
      );
    }
    resolved.set(definition.viewId, {
      ...definition,
      component: lazy(definition.load),
    });
  }

  return {
    compile(document) {
      const root = compileNodeV1(document.root, "/root", resolved, null, null);
      const inspection: CodeSurfaceInspectionV1 = {
        compositionId: document.compositionId,
        nodes: inspectCodeSurfaceNodesV1(root),
      };
      return {
        compositionId: document.compositionId,
        inspection,
        render(context, reportFault, observeLifecycle) {
          return (
            <CodeSurfaceNodeHostV1
              key={`${root.nodeId}\0${root.viewId}`}
              compositionId={document.compositionId}
              node={root}
              context={context}
              {...(reportFault === undefined ? {} : { reportFault })}
              {...(observeLifecycle === undefined ? {} : { observeLifecycle })}
            />
          );
        },
      };
    },
  };
}

export function compileCodeSurfaceCompositionV1<TContext>(
  document: GuiCompositionDocumentV1,
  catalog: CodeSurfaceCatalogV1<TContext>,
): CompiledCodeSurfaceCompositionV1<TContext> {
  return catalog.compile(document);
}

export function CodeSurfaceCompositionHostV1<TContext>(props: {
  readonly composition: CompiledCodeSurfaceCompositionV1<TContext>;
  readonly context: TContext;
  readonly reportFault?: (fault: CodeSurfaceFaultV1) => void;
  readonly observeLifecycle?: (event: CodeSurfaceNodeLifecycleEventV1) => void;
}) {
  return props.composition.render(props.context, props.reportFault, props.observeLifecycle);
}
