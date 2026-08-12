# PhD Application Hub

一个本地优先、面向所有学科的 Obsidian 博士申请管理工具。

作者：**DUGUXUNXING**

## 核心思路

它把博士申请拆成彼此关联的六类信息：

- Supervisor：潜在导师、研究匹配度、套磁状态；
- University：学校、院系、申请制度、funding；
- Application：正式申请、deadline、材料、状态；
- Paper：与导师匹配和面试准备真正相关的论文；
- Interaction：邮件、回复、会议、面试和 follow-up；
- Document：CV、SOP、proposal、transcript 等材料版本。

所有核心数据仍然只是你 Vault 中的普通 Markdown 和 Properties。

## 最推荐的工作流

```text
发现导师
→ 建立 Supervisor
→ 评估 research fit
→ 联系导师
→ Replied / Positive
→ Positive 后创建 University + Application
→ 准备材料和 Tasks
→ Submitted
→ Interview
→ Offer / Rejected / Declined
```

`Replied` 与 `Positive` 被刻意区分：礼貌回复并不等于值得正式申请；只有明确鼓励申请、表现出实质兴趣、建议进一步讨论等情况才建议设为 `Positive`。

## 安装后第一次使用

1. Settings → PhD Application Hub。
2. 根目录默认 `PhD Application`，可修改。
3. 设置申请周期，如 `2027`。
4. 点击 `Initialize workspace`。
5. 从命令面板运行 `Add supervisor` 开始。

## Application 固定状态

- Researching
- Shortlisted
- Preparing
- Submitted
- Interview
- Offer
- Rejected
- Declined

建议始终通过插件的 `Update application status` 修改，而不要手工输入。

## Supervisor 联系状态

- Not contacted
- Drafting
- Sent
- Replied
- Positive
- Follow-up
- Closed

设置为 Positive 时，插件会询问是否自动创建对应 University 和 Application。

## Tasks

Tasks 插件不是必须依赖。Application 中生成的 checklist 本身就是普通 Markdown task。

如果安装并启用 Tasks，Dashboard 还会自动汇总：

- overdue / today；
- 未来 30 天任务。

查询使用 Tasks 内置日期语法，不需要开启 JavaScript queries。

## 隐私

插件没有遥测、登录、外部 API 或云数据库，不会主动访问网络。数据全部保存在本地 Vault 中。


## Deadline 自动同步（1.0.1）

Application 的 `deadline` 现在是标准申请任务日期的唯一基准。你可以直接修改 Application 顶部 Properties 中的 `deadline`，或者运行 **PhD Application Hub: Update application deadline**。插件会自动重新计算标准 checklist 的 due date，其中 **Submit application** 始终与官方 deadline 同一天。

插件启动时也会校准已有 Application，因此以前先创建、后来才补 deadline 的记录不需要重建。

Dashboard 中两个区域含义不同：

- **Applications — next 30 days**：按 Application 显示即将到期的正式申请；
- **Tasks due in the next 30 days**：显示 Tasks 插件识别到的具体行动项，例如 Finalize CV、Upload documents、Submit application。
