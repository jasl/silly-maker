# 仓库结构

```text
engine/packages/base      契约、确定性运行时、会话、持久化、
                          重放、诊断（MIT）
engine/packages/ui        React 壳、舞台、overlay、DevDock（MIT）
engine/packages/web       浏览器宿主、IndexedDB/HTTP 持久化、
                          自动化、指针输入（MIT）
engine/packages/tooling   项目配置、story CLI 命令（MIT）

e2e/                      Engine Lab：中立一致性 Story（MIT）
template/                 最小起点 Story——复制我（MIT）
examples/bookshop         剧本写法示例（MIT）
examples/cat-cafe         系统展示：内容数据库、命中区域、事件池、
                          回合制、元进度、i18n
                          （代码 PolyForm-NC，文案 CC BY-NC-SA）

project.config.ts         所有应用在一处注册
scripts/                  构建身份、资产校验、存档服务器
docs/                     内部工程文档（计划、研究、提案、政策）
                          ——不对外发布
website/                  本文档站（en + zh）
```

包之间只经声明的出口（`@sillymaker/*`）互相消费；Story 之间绝不互相 import。许可按路径与包生效——根 `LICENSE.md` 是准绳。
