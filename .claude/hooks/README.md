# Claude 项目提示钩子

2026-10-06。事件 `PostToolUse`，matcher `Edit|Write`。

仅监听 Claude 原生 Edit/Write 成功后的精确目标路径；提示核对存档生命周期或生成镜像真源，不自动改文件。Bash、MCP及外部工具改写不在覆盖范围，不能作为防写门禁。

未知、坏类型、超大输入、越界与嵌套项目输入静默返回空 JSON；3秒超时，标准库，无服务/模型启动、无权限变更、无 Stop 循环。配置成功和隔离测试不等于客户端已信任或原生事件已触发；按 Claude `/hooks` 查看实际加载。

运行隔离测试：`python3 .claude/hooks/test_project_context.py`。测试复制脚本到临时工程，不改业务文件。

来源：本项目 `.codex/hooks/mirror_edit_context.py` 的只读检查逻辑，基于 2026-10-06 [Claude hook schema](https://code.claude.com/docs/en/hooks) 适配。源快照 SHA256：`3cd5381a1949e7c73c395a2e05bf7b172a8bd58d9cb857ad66185ec2d3b45df8`。Claude 协议实现独立维护；未修改 Codex 真源。
