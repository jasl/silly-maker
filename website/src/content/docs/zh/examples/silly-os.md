---
title: "SillyOS"
description: "从 Creator Home 进入 Program Workspace 的 GUI-only 确定性预览。"
---

SillyOS Creator Preview 是一个使用 SillyMaker 构建的 GUI-only 产品切片。它唯一
内置、面向用户的程序是 **Agent Creator**。

[打开 SillyOS](../../../play/silly-os/)

## 当前流程

1. 在 **Creator Home** 描述翻译、写作、角色扮演或通用创作意图；
2. Agent Creator 生成确定性的本地回复和 Program 方案；
3. 进入 **Program Workspace**，在同一工作区查看对话、方案、预览和活动；
4. 接受或拒绝这份确切的本地方案。

这个切片用于验证 GUI 结构、响应式工作区和人类审查流程。预览是确定性且完全本地
的；接受方案不会创建或发布真实应用。

## 当前边界

这个预览尚未接入真实 Pi、数据库、RPC 后端、Mod 激活或持久化。刷新页面会开始新的
本地会话。界面中的 Program 和能力只是方案数据，不代表这些系统已经接通。
