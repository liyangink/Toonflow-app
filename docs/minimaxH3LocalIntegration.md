# 本地 MiniMax H3 接入 Toonflow：实施方案

状态：Toonflow 侧已按本方案接入代码。视频节点、Web 和 Server 构建通过；临时启动的 Toonflow Server 已通过模型列表接口返回本地 H3 的六种尺寸、逐任务参数和引用能力。独立审查发现的 Toonflow 侧问题已修正。`minimax-h3-server` 尚未启动，实际视频生成联调待进行；Web 与 Server 的类型检查仍受仓库缺少 `.hutch/devkit/api/config/ElectrobunConfig` 影响。`minimax-h3-server` 是独立服务；本文件只规定 Toonflow 侧接入。服务接口以 `/Users/liyang/minimax-h3-server/design.md` 和当前实现为准。

## 接入形态

沿用现有视频生成节点和媒体生成任务链路，新增一个本地 H3 **媒体供应商适配器**，不新建视频节点。用户在媒体模型设置中填写服务地址和 Bearer token。适配器调用 `POST /v1/tasks`，轮询 `GET /v1/tasks/{id}`，用同一 token 下载 `GET /v1/tasks/{id}/artifact`，返回最终 MP4 给 Toonflow 现有工作区落盘流程。`GET /v1/capabilities` 提供默认值和校验范围；它不是 Toonflow 的模型列表接口，本地 H3 的模型能力由适配器声明。

首版沿用 Toonflow 当前任务生命周期：生成期间保持应用和视频节点打开；关闭应用后，本地服务继续烧制并保留制品，但 Toonflow 不自动回填原节点。用户可从服务管理后台取得该制品。服务没有取消任务接口，节点的停止操作只停止 Toonflow 等待，界面需说明本地烧制仍会继续。

## 节点配置与尺寸

本地 H3 模型展示现有模式选择：纯文本、首帧／尾帧、混合有序参考。提示词始终必填；首尾帧与有序参考互斥。时长继续使用节点的 `duration`，适配器将其传为服务的 `parameters.seconds`。H3 始终生成音轨，模型声明 `audio: true`，不提供关闭音频选项。

H3 模型使用**单个明确的宽×高选择**，隐藏现有独立的比例与分辨率选择，避免二者冲突。首版只列以下六项，默认 `512×512`：

| 比例 | 尺寸 |
| --- | --- |
| 1:1 | `512×512`、`768×768` |
| 16:9 | `1024×576` |
| 9:16 | `576×1024` |
| 4:3 | `1024×768` |
| 3:4 | `768×1024` |

所选尺寸直接拆成 `parameters.width`、`parameters.height`。这六项的宽高均为 32 的倍数，面积不超过 `768×1344`。服务端只校验逐任务宽高是否合法，不设固定输出分辨率；Toonflow 不依赖内部渲染尺寸。首版没有任意宽高输入框，避免“可选尺寸”范围与实际 UI 不一致；以后确需自定义时再加入相同规则的校验。

联调前需修正服务端当前实现：`server/task_api.py` 在配置内部渲染尺寸时，还要求输出与其同宽高比且包含它；这与上面的逐任务合法尺寸约定冲突，会挡住部分可选尺寸。该修正由独立服务项目完成。

本地 H3 供应商声明逐任务配置：`seed`、`steps`、`layers`、`reuse`。视频节点按模型声明显示这些字段，不硬编码 H3 的参数规则。`seed` 为十进制字符串，避免 JavaScript 丢失 64 位整数精度；其余为整数。未填写的字段不提交，由服务端 `taskDefaults` 补齐。Toonflow 的 H3 请求固定提交 `coreReuse: 1`，使 `reuse > 1` 始终满足互斥规则。节点 UI 和 Agent 的 `getConfig`、`setConfig` 暴露同一组值与允许范围；其他供应商的配置行为保持不变。

参数传递链路为：节点数据 → `NodeVideoRequest` → `/api/ai/media/generate` 的严格校验 → 服务端 `prepareRequest` → 供应商的 `VideoRequest.other` → 本地 H3 适配器的 `request.parameters`。`other` 仅放 H3 逐任务参数和选定尺寸；供应商适配器负责最终验证与字段映射。公共的 `duration` 仍单独传递，不在 `other` 重复存储。模型声明需向节点提供所支持的 H3 参数和尺寸选项，节点按声明显示，不能对所有视频模型显示 H3 字段。

## 引用与提示词

视频节点当前的 `refList` 同时包含 IMAGE、VIDEO、AUDIO、STRING，`{{ref N}}` 按该列表统一编号；服务端现有请求却把媒体拆为图片、视频、音频数组。增加通用的有序 `referenceBindings` 清单，随生成请求通过严格校验，记录每个原始编号对应的媒体类型、数组位置或首尾帧角色。现有分类型数组保留，以免影响其他供应商。服务端读取一次素材后，把清单和已读取的媒体一并交给本地 H3 适配器。

参考模式下，适配器按 `referenceBindings` 原顺序组装 `conditioning.references` 和同名 multipart 文件 part，并把提示词中的 `{{ref N}}` 转成 H3 按媒体类型分别计数的 `<Picture n>`、`<Video n>`、`<Audio n>`。STRING 引用仍作为文本加入提示词，占 Toonflow 原编号但不占 H3 媒体引用名额。首尾帧模式提交 `firstFrameFileKey`、`lastFrameFileKey`，提示词标记转换为首帧／尾帧描述，不生成 Picture 引用。不存在的标记、缺素材及冲突模式在提交前报错。

每条 VIDEO 引用选择以下语义，按服务当前已实现的类型提交：

| 节点选择 | 服务引用类型 | h3.c 参数 |
| --- | --- | --- |
| 仅参考画面 | `silentVideo` | `--ref-silent-video` |
| 保留视频原音轨 | `video` | `--ref-video` |
| 视频搭配指定音频 | `videoWithAudio`，另带 `audioFileKey` | `--ref-video-audio VIDEO AUDIO` |

“搭配指定音频”须明确选择一个已连接的 AUDIO 输入；该音频被配对使用，不再作为第二条独立 `audio` 参考提交，但继续占原 Toonflow 引用编号。未配对的 AUDIO 输入作为独立 `audio` 参考。服务限制为最多 12 条参考、9 张图片、3 段视频、3 路音频；独立音频必须与图片或视频同用。节点先校验这些数量，服务继续做最终校验。服务当前代码在 `server/task_api.py` 接受全部五种引用类型，在 `server/task_runner.py` 将它们映射到相应 h3.c 命令参数。

## Toonflow 改动范围

1. `packages/providers/src/media/`：新增本地 H3 适配器；在供应商列表及内置安装入口注册，声明模型模式、时长、尺寸和参数能力。
2. `packages/nodes/videoGenerationNode/`：按模型声明通用地显示可选尺寸和参数；扩展 `getConfig`、`setConfig`；保留原始引用顺序和逐视频声音选择。H3 字段定义与映射留在供应商适配器，不放入节点脚手架。
3. `packages/toolScaffold`、`packages/tools/mediaGeneration`、`packages/providers/types.d.ts`：增加并校验可选的 `other`、`referenceBindings`，其余供应商继续使用原请求字段。
4. `apps/server/src/utils/media/generation.ts`：将新字段透传到供应商，继续用已有工作区路径校验、素材读取与结果保存。供应商运行环境需支持 multipart；可注入标准 `FormData`。

适配器不返回远端任务 ID 充当媒体结果，必须在服务任务成功后下载带鉴权的 MP4，并返回最终二进制 `MediaAsset`。保留当前 Toonflow 单参考文件及输出文件各 100 MB 的限制；服务端较大的上传上限不改变 Toonflow 此限制。服务返回 429、413、参数错误或任务失败时，把原因显示给节点；不自动重提任务。

## 主工作流边界

视频节点已经区分首尾帧模式与混合参考模式；本方案补齐有序引用的跨层传递后，两种输入路线都能接到 H3 服务。手工选择模型、填写提示词和使用节点工具，不受主 workflow 的提示词路由限制。

`packages/skills/workflow/SKILL.md` 目前把“已有定稿剧本／时间轴 + 制作或生成视频”硬路由到 Seedance 2.0/2.5，即使用户明确指定 H3 也一样；该阶段还禁止使用另一套提示词方法。它会妨碍 Agent 按完整主工作流自动制作 H3 视频，云端 H3 同样受影响。若本次交付范围包括 Agent 从定稿剧本自动规划并使用 H3，需在主 workflow 入口增加一个**明确选择 H3 时走 H3 路线**的最小分支，并允许该路线读取已安装的 H3 提示词 skill；Seedance 2.0/2.5 路线保持原规则。仅接通视频节点和供应商时，先不改主 workflow。

本轮明确先不修改主 workflow skill；先用节点实际生成观察效果，再决定是否调整 Agent 路由。
