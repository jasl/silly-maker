---
title: "SillyOS"
description: "带隔离 Workspace 与网络 companion 的浏览器本地 Agent Creator 产品。"
---

SillyOS 是一个使用 SillyMaker 构建、在浏览器本地运行的 Agent 产品。它唯一内置、
面向用户的程序是 **Agent Creator**。

[打开独立部署的 SillyOS](https://silly-os.jasl9187.workers.dev/)

## 当前流程

1. 在 **Creator Home** 描述翻译、写作、角色扮演或通用创作意图；
2. Agent Creator 通过确定性预览或显式配置的 Provider 路线生成本地 Program 方案；
3. 进入 **Program Workspace**，在同一工作区查看对话、方案、预览和活动；
4. 接受或拒绝这份确切的本地方案。

这个产品用于验证 GUI 结构、响应式工作区、浏览器本地 Agent 执行和人类审查流程；
接受方案会更新本地 Program 与 workspace，但不会发布远端应用。

## 当前边界

确定性预览仍然可用；配置后的 Browser 路线会把产品固定版本的 Pi 加载进 Agent Worker，
并经 typed Worker RPC 连接页面与 Workspace Host。Program catalog
和 continuation records 存在浏览器本地数据库中；mutable 工程文件及其当前 checkpoint
存在 OPFS 中。刷新后可以重新打开同一个本地卷与 generation，而不是静默创建空工作区。

SillyOS 明确由控制应用、独立 Workspace Sandbox 和独立 Network Broker 三个 origin
组成。文档站因此链接到独立部署，而不再内嵌一个无法满足 origin 与 CSP 合同的残缺静态副本。

当前 checkpoint 门禁覆盖恢复与单写者 ownership、Chromium/WebKit 的 20 MiB 级工作区
证据，以及浏览器来源级存储估算与显式持久化请求 UI。估算针对完整网站来源，仅供参考，
不是某个 Program 的容量上限；浏览器拒绝持久化请求也不会停用工作区。

部署的 Worker 只提供静态资产。Program 数据始终留在访问者当前浏览器 origin 中；
Cloudflare 不接收、同步或备份这些数据。更换 origin 或清除站点数据会丢失本地 checkpoint。
当前 mutable Workspace head 已可导出 canonical ZIP，accepted immutable snapshot 也会在本地
保留；这个 ZIP 不是完整产品备份，accepted-snapshot 下载和便携 import/restore 尚未实现。
当前也没有 public Agent Host ABI 或已晋级的 Desktop 持久化。
