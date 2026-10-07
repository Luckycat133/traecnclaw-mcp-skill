# Antigravity 项目动态提示

2026-10-06。原生配置在 `../hooks.json`，使用 PreInvocation / injectSteps / ephemeralMessage。
Git 限定路径 status（未暂存、暂存、新文件、删除）；不读取文件内容或执行外部 diff。
固定 cwd 是 `.agents`；workspacePaths 必须包含当前项目根目录。限制输入 64 KiB；
拒绝越界符号链接和嵌套项目。Git 子进程每次最长 1 秒，整体钩子限时 3 秒。
不写状态、源文件或 index，不调用模型、测试、业务服务，不设置权限决策或 Stop 循环。

每次模型调用前重查当前状态；仅异常或相关未提交改动存在时输出短暂提示。
提示可能源于其他会话的工作，不推断改动归属。状态消失后自动静默。
这与 Claude/Codex 编辑事件的时机不同；Antigravity PostToolUse 的输出协议
不能承载 additionalContext，所以没有直接复制其 JSON。
现有 model_decision 规则仍供任务开始、工作区干净及非 Git 情况按需加载。

在项目根运行 `python3 .agents/hooks/test_project_context.py`。测试仅在系统临时目录
创建 Git 样本和占位文件，不提交、不修改本项目 Git 状态，不执行产品代码。
文件/协议与隔离测试通过不证明客户端已发现或真正触发；未修改信任或客户端开关。

协议依据：[Antigravity hooks](https://antigravity.google/docs/hooks/)。
