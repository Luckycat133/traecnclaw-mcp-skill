# 项目定向 Codex hook

事件 `PostToolUse`，matcher `^apply_patch$`；实现 `mirror_edit_context.py`。

Immediately route generated Skill edits to canonical source and synchronization contract.

- 只用 Python 3.9+ 标准库，3 秒超时，additionalContextLimit=500。只输出 additionalContext；不阻断、续跑、改权限或工具输入。
- 校验脚本真实根、进程 cwd、payload cwd、嵌套项目与软链接边界。坏/大/未知输入输出 `{}`，不写状态、不读对话或用户业务数据、不联网、不执行应用/模型/测试。
- 仅解析 apply_patch 协议文件头及 Move-to；代码文本提到路径不触发。Bash/其他工具写入不在覆盖内，不能撤销已发生编辑；提示仅说调用涉及目标，不声称工具成功。
- 原生按项目层 trust 和 hook definition hash 分别审核；配置存在或 fixture 通过不证明已启用。此配置不写 trust、不使用绕过。

运行隔离测试：`python3 .codex/hooks/test_project_context.py`。测试不触及真实业务数据。

来源：[官方 Hooks](https://learn.chatgpt.com/docs/hooks)；项目规则仍由对应 Skill/AGENTS 维护。文件存在性与历史报告不替代当前运行证据。
