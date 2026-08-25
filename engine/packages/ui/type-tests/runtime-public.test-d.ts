// SPDX-License-Identifier: MIT
import {
  createGameSymbolRegistryV1,
  createSemanticPublicationBridgeV1,
  parseGameSymbolIdV1,
  type GameSymbolProviderV1,
  type SemanticActionControlPropsV1,
  type SemanticPublicationBridgeV1,
} from "@sillymaker/ui";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

interface PublicationV1 {
  readonly revision: number;
  readonly game: { readonly count: number };
  readonly narrative: null;
  readonly actions: readonly [];
}

interface SemanticPortV1 {
  dispatch(invocation: { readonly actionId: "action.test" }): Promise<void>;
}

type PublicBridgeKeysV1 = ExpectV1<
  EqualV1<keyof SemanticPublicationBridgeV1<PublicationV1>, "dispose" | "getSnapshot" | "subscribe">
>;

declare const semanticV1: SemanticPortV1;
declare const publicationV1: PublicationV1;

const bridgeV1 = createSemanticPublicationBridgeV1({
  observe: () => publicationV1,
  subscribe: () => () => undefined,
});
bridgeV1.getSnapshot();

declare const actionPropsV1: SemanticActionControlPropsV1<
  { readonly code: "reason.test" },
  { readonly actionId: "action.test" },
  void
>;
actionPropsV1.semantic satisfies SemanticPortV1;

const symbolIdV1 = parseGameSymbolIdV1("symbol.test.counter");
declare const symbolProviderV1: GameSymbolProviderV1;
createGameSymbolRegistryV1([symbolProviderV1]).resolve(symbolIdV1);

semanticV1;

export type { PublicBridgeKeysV1 };
