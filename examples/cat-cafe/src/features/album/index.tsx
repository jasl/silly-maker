// SPDX-License-Identifier: MIT
// Album slice: unlock predicates (write Host meta progression), card-art mapping, and the album grid view.
// Content tables in ./content.ts; the composition layer only wires the overlay slot here.
import { useEffect, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { DeepReadonly } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { resolveAssetUrlV1 } from "@sillymaker/ui";

import type { CatcafeAssetRegistryV1, CatcafeUiPublicationV1 } from "../../application/ui-kit.ts";
import { catcafeThemeV1, useCatcafeTextV1 } from "../../application/ui-kit.ts";
import { catcafeAlbumV1 } from "../../content.ts";
import { catcafeAssetIdsV1 } from "../../presentation.ts";

/** Album unlock predicate: observes semantic publications and writes Host meta progression (cross-save) when satisfied. */
export const catcafeAlbumPredicatesV1: readonly {
  readonly albumId: string;
  readonly unlocked: (publication: DeepReadonly<CatcafeUiPublicationV1>) => boolean;
}[] = Object.freeze([
  {
    albumId: "album.growth.rescue",
    unlocked: (publication) => publication.semantic.narrative.phase === "completed",
  },
  {
    albumId: "album.growth.purr",
    unlocked: (publication) => publication.semantic.game.cat.trust >= 30,
  },
  {
    albumId: "album.growth.leap",
    unlocked: (publication) => publication.semantic.game.cat.skill >= 20,
  },
  {
    albumId: "album.ending.champion",
    unlocked: (publication) =>
      publication.semantic.game.ending === "champion" ||
      publication.semantic.game.shop.epilogue === "champion",
  },
  {
    albumId: "album.ending.signboard",
    unlocked: (publication) =>
      publication.semantic.game.ending === "signboard" ||
      publication.semantic.game.shop.epilogue === "signboard",
  },
  {
    albumId: "album.ending.adopted",
    unlocked: (publication) =>
      publication.semantic.game.ending === "adopted" ||
      publication.semantic.game.shop.epilogue === "adopted",
  },
  {
    albumId: "album.ending.ordinary",
    unlocked: (publication) =>
      publication.semantic.game.ending === "ordinary" ||
      publication.semantic.game.shop.epilogue === "ordinary",
  },
  {
    albumId: "album.trophy.week3",
    unlocked: (publication) => publication.semantic.game.shop.trophies >= 1,
  },
  {
    albumId: "album.trophy.week5",
    unlocked: (publication) => publication.semantic.game.shop.trophies >= 2,
  },
  {
    albumId: "album.trophy.week7",
    unlocked: (publication) => publication.semantic.game.shop.trophies >= 3,
  },
  {
    albumId: "album.memory.regular",
    unlocked: (publication) => publication.semantic.game.shop.reputation >= 40,
  },
]);

export function useCatcafeAlbumWatcherV1(
  publication: DeepReadonly<CatcafeUiPublicationV1>,
  playerProfile: PlayerProfileStoreV1,
): void {
  useEffect(() => {
    const meta = playerProfile.current().meta;
    for (const predicate of catcafeAlbumPredicatesV1) {
      if (meta[predicate.albumId] === undefined && predicate.unlocked(publication)) {
        void playerProfile.markMeta(predicate.albumId);
      }
    }
  }, [publication, playerProfile]);
}

export const catcafeAlbumAssetForV1 = (albumId: string): string | undefined => {
  const key = albumId.replace("album.growth.", "album_").replace("album.memory.", "album_");
  if (albumId.startsWith("album.trophy.week")) {
    return catcafeAssetIdsV1[
      `album_trophy${albumId.slice("album.trophy.week".length)}` as keyof typeof catcafeAssetIdsV1
    ];
  }
  // Ending collection cards reuse scene art: champion=trophy, signboard=storefront, adoption=backyard, ordinary=rainy alley.
  if (albumId.startsWith("album.ending.")) {
    const byEnding: Readonly<Record<string, string>> = Object.freeze({
      champion: catcafeAssetIdsV1.album_trophy7,
      signboard: catcafeAssetIdsV1.bg_shopfront,
      adopted: catcafeAssetIdsV1.bg_backyard,
      ordinary: catcafeAssetIdsV1.bg_title,
    });
    return byEnding[albumId.slice("album.ending.".length)];
  }
  return catcafeAssetIdsV1[key as keyof typeof catcafeAssetIdsV1];
};

export function CatcafeAlbumViewV1(props: {
  readonly playerProfile: PlayerProfileStoreV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
}): ReactElement {
  const uiText = useCatcafeTextV1(props.playerProfile);
  const profile = useSyncExternalStore(
    (listener) => props.playerProfile.subscribe(listener),
    () => props.playerProfile.current(),
  );
  const revision = useSyncExternalStore(
    (listener) => (props.registry === null ? () => {} : props.registry.subscribe(listener)),
    () => (props.registry === null ? 0 : props.registry.observe().revision),
    () => 0,
  );
  void revision;
  return (
    <ol
      data-cc-album="true"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "12px",
        margin: 0,
        padding: 0,
        maxInlineSize: "640px",
      }}
    >
      {catcafeAlbumV1.rows().map((entry) => {
        const unlocked = profile.meta[entry.id] !== undefined;
        const url = unlocked
          ? resolveAssetUrlV1(props.registry, catcafeAlbumAssetForV1(entry.id), "ui_decoration")
          : null;
        return (
          <li
            key={entry.id}
            data-cc-album-entry={entry.id}
            data-cc-album-unlocked={String(unlocked)}
            style={{
              listStyle: "none",
              borderRadius: "12px",
              overflow: "hidden",
              border: catcafeThemeV1.panelBorder,
              background: unlocked ? catcafeThemeV1.panelSoft : "rgba(255, 255, 255, 0.04)",
              opacity: unlocked ? 1 : 0.55,
            }}
          >
            <div
              style={{
                aspectRatio: "3 / 2",
                background: "rgba(0, 0, 0, 0.35)",
                display: "grid",
                placeContent: "center",
              }}
            >
              {url !== null
                ? (
                  <img
                    src={url}
                    alt={uiText(entry.nameTextId)}
                    style={{ inlineSize: "100%", blockSize: "100%", objectFit: "cover" }}
                  />
                )
                : <span style={{ fontSize: "22px", opacity: 0.6 }}>{unlocked ? "♪" : "？"}</span>}
            </div>
            <div style={{ padding: "8px 10px", display: "grid", gap: "2px" }}>
              <strong style={{ fontSize: "13px" }}>
                {unlocked ? uiText(entry.nameTextId) : "？？？"}
              </strong>
              {unlocked
                ? (
                  <p style={{ margin: 0, fontSize: "12px", opacity: 0.85 }}>
                    {uiText(entry.captionTextId)}
                  </p>
                )
                : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
