<script setup lang="ts">
// 首页 hero 的“试玩”下拉：点击弹出示例列表（VitePress hero 按钮
// 不支持下拉，这里用主题扩展补一个，样式对齐 VPButton）。
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useData, withBase } from "vitepress";

const { lang } = useData();
const open = ref(false);
const root = ref<HTMLElement | null>(null);

const labels = computed(() =>
  lang.value.startsWith("zh")
    ? {
        button: "试玩示例",
        catCafe: "《雨巷猫舍》（养成经营）",
        sillyOs: "SillyOS 98（复古桌面）",
      }
    : {
        button: "Play the demos",
        catCafe: "Cat Cafe (sim)",
        sillyOs: "SillyOS 98 (retro desktop)",
      },
);

function onDocumentClick(event: MouseEvent): void {
  if (root.value !== null && !root.value.contains(event.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));
</script>

<template>
  <div ref="root" class="play-menu">
    <button type="button" class="play-menu__button" :aria-expanded="open" @click="open = !open">
      {{ labels.button }}
      <span class="play-menu__caret" aria-hidden="true">▾</span>
    </button>
    <div v-if="open" class="play-menu__panel" role="menu">
      <a role="menuitem" class="play-menu__item" :href="withBase('/play/cat-cafe/')">
        {{ labels.catCafe }}
      </a>
      <a role="menuitem" class="play-menu__item" :href="withBase('/play/silly-os/')">
        {{ labels.sillyOs }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.play-menu {
  position: relative;
  display: inline-block;
  margin: 6px;
}

.play-menu__button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 20px;
  padding: 0 20px;
  line-height: 38px;
  font-size: 14px;
  font-weight: 600;
  background-color: var(--vp-button-alt-bg);
  color: var(--vp-button-alt-text);
  transition:
    color 0.25s,
    border-color 0.25s,
    background-color 0.25s;
}

.play-menu__button:hover {
  border-color: var(--vp-button-alt-hover-border);
  color: var(--vp-button-alt-hover-text);
  background-color: var(--vp-button-alt-hover-bg);
}

.play-menu__caret {
  font-size: 11px;
}

.play-menu__panel {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: calc(100% + 6px);
  min-inline-size: 240px;
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
  z-index: 30;
  text-align: start;
}

.play-menu__item {
  display: block;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.play-menu__item:hover {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-brand-1);
}
</style>
