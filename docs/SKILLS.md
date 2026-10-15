# Skill 管理（对接统一 agent 平台）

agent 的运行、调度、记忆由**统一 agent 平台**管理；本项目只提供 agent Skill 的**查看与编辑**前端。
入口：设置 → Skill 管理（`/settings/skills`），详情 `/settings/skills/:skillId`。也可从「AI agent能力设置」页的各 agent 卡片跳转。

## Skill 是什么

一个 Skill 是一个文件夹：必须有 `SKILL.md`（YAML frontmatter + Markdown 指令），可带 `references/*.md`、`scripts/*`、`assets/*` 等辅助文件。

```markdown
---
name: invoice-ocr-review
description: 识别结果低置信度时，按国家规则复核关键字段并给出纠正建议。
---

# 发票识别复核
……
```

校验规则（前端保存前检查，平台端同样校验）：

| 字段 | 规则 |
|---|---|
| name | 必填；小写字母、数字、连字符（kebab-case）；≤ 64 字符；同一租户内唯一 |
| description | 必填；≤ 1024 字符；不含尖括号 `<` `>` |
| 文件路径 | 相对路径，不能含 `..`，不能以 `/` 开头 |
| 单文件 | ≤ 512 KB；整个 Skill ≤ 5 MB |

## 页面能力

- **列表**：搜索（名称 / 描述）、按状态（草稿 / 已发布 / 已停用）和绑定 agent 筛选；显示版本、绑定的 agent、最近修改人与时间。
- **详情 · 查看**：左侧文件树；中间 Markdown 渲染（`.md`）或代码视图（其他文件）；右侧元数据（frontmatter 解析结果、绑定 agent、权限、版本）。
- **详情 · 编辑**（需 `skill_editor` 或 `admin` 角色）：
  - 文本编辑 + 实时预览分栏；新增 / 重命名 / 删除文件
  - 实时校验 frontmatter，错误阻止发布
  - 保存草稿（平台生成草稿版本，不影响线上 agent）
  - 发布（填写变更说明，生成新版本，平台按绑定关系下发到 agent）
  - 离开页面前提示未保存修改
- **版本历史**：列出各版本（版本号、说明、作者、时间、状态），任选两个版本对比差异（逐行 diff），可基于历史版本恢复为新草稿。

## 平台 API 约定（草案）

根地址：运行时配置 `agentPlatformBaseUrl`（默认 `/agent-api`，由 Ingress 转发到 agent 平台）。请求携带用户的 OIDC 访问令牌（`Authorization: Bearer …`）与 `X-Tenant-Id`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/v1/skills?query=&status=&agent=` | 列表，返回 `SkillSummary[]` |
| GET | `/v1/skills/{id}` | 详情（当前草稿或最新发布版本），含文件内容 |
| POST | `/v1/skills` | 新建（返回草稿） |
| PUT | `/v1/skills/{id}/draft` | 保存草稿，body：`{ files: SkillFile[], baseVersion }`；版本冲突返回 409 |
| POST | `/v1/skills/{id}/publish` | 发布，body：`{ note }` |
| GET | `/v1/skills/{id}/versions` | 版本列表 |
| GET | `/v1/skills/{id}/versions/{version}` | 某版本完整内容（用于对比与恢复） |
| PATCH | `/v1/skills/{id}` | 启用 / 停用 |

类型定义见 `src/features/skills/types.ts`。mock 模式下数据保存在内存（刷新即恢复初始示例）。
