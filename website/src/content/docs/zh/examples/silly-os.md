---
title: "SillyOS"
description: "从 Creator Home 进入 Program Workspace 的 GUI-only 确定性预览。"
---

SillyOS Creator Preview 是一个使用 SillyMaker 构建的 GUI-only 产品切片。它唯一
内置、面向用户的程序是 **Agent Creator**。

[打开 SillyOS](../../../play/silly-os/)

## 当前流程

1. 在 **Creator Home** 描述翻译、写作、角色扮演或通用创作意图；
2. 默认由 Agent Creator 生成确定性的本地回复和 Program 方案；
3. 进入 **Program Workspace**，在同一工作区查看对话、方案、预览和活动；
4. 接受或拒绝这份确切的本地方案。

这个切片用于验证 GUI 结构、响应式工作区和人类审查流程。预览是确定性且完全本地
的；接受方案不会创建或发布真实应用。

## 当前边界

默认入口仍是确定性的本地预览。显式 query-gated Browser 路线会把产品固定版本的 Pi
加载进 Agent Worker，并经 typed Worker RPC 连接页面与 Workspace Host。Program catalog
和 continuation records 存在浏览器本地数据库中；mutable 工程文件及其当前 checkpoint
存在 OPFS 中。刷新后可以重新打开同一个本地卷与 generation，而不是静默创建空工作区。

当前 checkpoint 门禁覆盖恢复与单写者 ownership、Chromium/WebKit 的 20 MiB 级工作区
证据，以及浏览器来源级存储估算与显式持久化请求 UI。估算针对完整网站来源，仅供参考，
不是某个 Program 的容量上限；浏览器拒绝持久化请求也不会停用工作区。

部署的 Worker 只提供静态资产。Program 数据始终留在访问者当前浏览器 origin 中；
Cloudflare 不接收、同步或备份这些数据。更换 origin 或清除站点数据会丢失本地 checkpoint。
用于便携备份与恢复的 immutable snapshot 和 ZIP 导出/导入尚未实现；当前也没有 public
Mod/Agent ABI、通用 LLM Provider UI 或已晋级的 Desktop 持久化。
