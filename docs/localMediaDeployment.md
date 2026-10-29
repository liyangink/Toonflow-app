# AI 短剧本地图片与视频生成方案

> 资料核对：2026-10-29。本文记录当前选型与复现目标，不代表这些模型已经在本项目的设备上实测通过。

## 结论

建议让 **48GB 统一内存的 Apple Silicon Mac** 运行 Toonflow 和图片 ComfyUI，让 **RTX 3080 10GB＋32GB 内存**运行视频 ComfyUI。Mac 上以 **Z-Image-Turbo 批量文生图、FLUX.2 Klein 4B 做图片编辑与多图参考**为核心；Krea 2 Turbo 是有授权门槛的可选文生图模型。视频端优先复现作者公开的 **MiniMax H3 → H3 潜空间放大 → H3-to-LTX 适配器 → LTX 2.5 精修**流程，先以 **10 秒、768p** 为验收目标。

这套分工是选型方案，不是速度保证。作者在 8GB 显存、据其视频口述为 16GB 内存的 RTX 4060 Laptop 上报告 10 秒 768p 二采约 250–300 秒；3080 10GB＋32GB 尚未实测。图片端也没有本机可复核的同参数耗时，不能把社区声称的 8–10 秒/张写成产能指标。[视频与作者简介](https://www.bilibili.com/video/BV124hJ65EW8/) · [作者的安装说明](https://pan.quark.cn/s/11cef250fa5f#/share/doc/2aa663619f1842949fa31c960163c446)

## Toonflow 实际需要的图片能力

仓库的[图片生成节点](../packages/nodes/imageGenerationNode/readme.md)接收文本与图片参考；[资产生成流程](../packages/skills/v118workflow/references/generateAssets.md)要求角色图、场景图、父图衍生；[分镜图方法](../packages/skills/v118workflow/references/knowledge/imagePromptCraft.md)要求人物、道具、场景共同约束单帧。因此图片需求并非只有文生图。

| 用途 | 关键输入与操作 | 相对用量 | 优先方案 |
| --- | --- | --- | --- |
| 人物探索、场景气氛与构图草案 | 文生图；同提示词批量筛选 | 高 | Z-Image-Turbo；关键基准可用 GPT Image 人工制作 |
| 角色定妆、正侧背视图 | 稳定脸、发型、服装和体型；需要跨视角核对 | 中 | 先确定少量高质量基准图，再用 Klein 多参考生成候选并人工验收 |
| 换装、表情、同地点昼夜变化 | 以已选用父图为输入，只改指定部分 | 中至高 | Klein 图片编辑；局部遮罩重绘须单独验证工作流 |
| 大场景与布景 | 空间布局、地标、道具位置和光源一致 | 中 | Z-Image-Turbo 探索；Krea 2 Turbo 可作为视觉质量备选 |
| 分镜关键帧、视频首尾帧 | 人物＋场景＋道具多参考；锁定身份和空间关系 | 高 | Klein 多图参考；重要镜头用高质量基准图校正 |
| 失败图修订 | 重绘局部、保持其余区域与原图一致 | 随失败率变化 | Toonflow 有局部重绘交互，但所接 ComfyUI 工作流必须真正支持遮罩和相应输入映射 |

上表的“相对用量”只是按 Toonflow 流程判断的优先级，没有剧本、集数和镜头数时不虚构每集张数。定妆与场景主图通常需要少量严审；镜头关键帧和候选迭代会随制作单元增加。每张已选用图应保留来源、父图、模型、提示词和版本；不能将一次生成成功等同于人物一致性通过。

## 图片模型取舍

| 模型 | 已公开的能力与协议 | 在这套设备上的位置 |
| --- | --- | --- |
| [Z-Image-Turbo](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) | 官方定位为 **文生图**，8 次函数评估，偏写实人像、中英文字与指令遵循；Apache 2.0。官方写的是在 **16GB 显存**设备上运行，不是 3080 10GB 满血无卸载的保证。 | Mac 48GB 上优先试做大量人物与场景初稿。**不能把 Z-Image-Turbo 当成已具备图片编辑、多图参考的模型**；官方把编辑列为其他变体。 |
| [FLUX.2 Klein 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) | 官方明确支持文生图、图片编辑和多图参考；Apache 2.0；BF16 官方配置约需 **13GB 显存**。 | 是本方案覆盖换装、场景变体和多参考关键帧的关键模型。Mac 48GB 可先验证 ComfyUI 工作流与速度；3080 10GB 需要另测量化或卸载方案，不把 BF16 标成直接适配。 |
| [Krea 2 Turbo](https://huggingface.co/krea/Krea-2-Turbo) | 官方发布的是文生图模型，官方示例为 **8 步**；采用 [Krea 2 Community License](https://www.krea.ai/krea-2-licensing)，商业使用及输出受最近 12 个月**关联实体全部收入低于 100 万美元**的条件约束，达到门槛需事先取得企业授权。 | 作为 Mac 上的大场景或审美探索备选；不能替代编辑模型。量化版与“4 步 LoRA 后 12–18 秒”的社区组合尚无本机同参数实测，不列为产能承诺。 |
| [HiDream-O1-Image Full](https://huggingface.co/HiDream-ai/HiDream-O1-Image) | 官方支持文生图、编辑与主体驱动生成，MIT；Full 官方示例为 **50 步**且官方推理要求 CUDA GPU。 | 可作为质量对照或单独实验。现有资料不足以确认其在 Mac ComfyUI 与 3080 10GB 上兼具稳定性和批量速度，暂不放进主产线。 |

“图片编辑”与“遮罩局部重绘”不能混为一谈。Klein 的官方能力证明可参考原图修改，但 Toonflow 的局部重绘还需验证工作流是否接收原图、遮罩、其他参考图，以及是否能把修改约束在目标区域。[图片节点当前请求构造](../packages/nodes/imageGenerationNode/src/index.vue)已经有参考图与局部重绘路径，不能由此推断任意模型或供应商都支持这些输入。

GPT Image 适合人工制作少量人物脸、定妆与场景基准图；大批量仍以本地模型承担。**Codex/ChatGPT 内的图片生成能力不自动等于 Toonflow 可用的无限 API 额度。**[OpenAI 官方文档](https://developers.openai.com/api/docs/guides/chatgpt-api-credits)说明：符合条件的 Pro/Business 订阅可激活有限的 API credits，包含 Images API；是否可用取决于账号资格、激活与组织余额，应另行核实。

## 视频二采的已知证据

[作者视频](https://www.bilibili.com/video/BV124hJ65EW8/)简介写明“**H3 低分辨率 → H3 二采放大 → NVIDIA 潜空间转换器 → LTX 2.5 三步精修**”，画面标注“3 步 LoRA＋3 步精修”“10s 768p 二采 250–300s”。用户补充，作者在视频中口述笔记本内存为 **16GB**；视频页面文字本身只明确 8GB 显存。[同一作者的安装说明](https://pan.quark.cn/s/11cef250fa5f#/share/doc/2aa663619f1842949fa31c960163c446)写明原环境为 **RTX 4060 Laptop 8GB、`--lowvram`**。安装说明针对“三代单人锁脸加强版”，不能仅凭文件名断言它与视频计时使用的是完全相同的 JSON。

安装说明列出的主要文件和节点如下，正式搭建时以实际下载的工作流 JSON 为准：

| 环节 | 安装说明列出的配置 |
| --- | --- |
| H3 生成 | `minimax_h3_ref2va_pruned_int8_convrot.safetensors`；`qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors`；H3 视频／音频 VAE；H3 三步 LoRA |
| H3 二采与转换 | `minimax_h3_latent_upscaler_3d_fp16.safetensors`；`h3_ltx_adapter/model.safetensors`；自研 `Comfyui-XH_Toolbox` 中的转换节点 |
| LTX 2.5 精修 | `ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors`；Gemma 4 12B INT8 文本编码器；Conv Video VAE、Audio VAE、脸部 LoRA |
| 环境 | 作者使用 ComfyUI 0.37.0、`--lowvram`，并列出 KJNodes、SolAttn、H3 latent upscaler 与自研节点包 |

H3-to-LTX 不是把两种不兼容的潜空间直接相连；[适配器模型说明](https://huggingface.co/Efficient-Large-Model/H3-to-LTX-Latent-Adapter)明确给出 H3 latent 到 LTX 2.5 Conv Video VAE latent 的转换契约。作者文档同时指出 **Sage、SolAttn、LowVRAMAttention 补丁节点只是备用实验分支，未接入该工作流实际执行链**。所以先前“INT8＋Sparse Attention＋Turbo LoRA 四步同时带来视频速度”的表述不适用于这条实测；这里可确认的是量化权重、低显存运行、H3 三步 LoRA、潜空间放大与 LTX 三步精修。

RTX 3080 的 10GB 显存与 32GB 内存高于作者报告的容量，因此**跑通同类 10 秒 768p 流程有较强证据支持**，但还不能推导它更快、一定不触发磁盘交换，或 15 秒、额外升到 1K 也能成功。3080 属于 Ampere，文档中的 NVFP4 文本编码器不等于有原生 Blackwell FP4 加速；[ComfyUI 的说明](https://blog.comfy.org/p/new-comfyui-optimizations-for-nvidia)指出 NVFP4 的加速面向 Blackwell，低显存时的 CPU 卸载速度还受内存与 PCIe 影响。先用同一 JSON、权重和输出规格实测，不按显卡算力线性换算 250–300 秒。

## 集成落点与复现顺序

Mac 可安装[官方 Comfy Desktop](https://docs.comfy.org/installation/desktop/macos)；其底层 ComfyUI 有 [`/prompt`、`/ws`、`/history/{prompt_id}`、`/upload/image`、`/view`](https://docs.comfy.org/development/comfyui-server/comms_routes) 等本地服务接口，跨机器访问由内网组网解决。Mac 的 ComfyUI 使用 MPS，并不是把 ComfyUI 工作流自动交给 MLX 执行；要换专用 MLX 引擎，需要另验编辑、多参考图与 API 输入能力。两台机器可各维护独立 ComfyUI 实例，避免图片任务占用 3080 的视频显存。

Toonflow 当前图片／视频节点和[媒体生成工具](../packages/tools/mediaGeneration/readme.md)有参考素材与模型配置入口，但仓库现有内置提供方里没有通用 ComfyUI 适配器。后续接入时需按本项目提供方接口，把参考图上传到对应 ComfyUI、填充所选工作流 JSON、提交 `/prompt`、跟踪任务、取回输出并保存到 Toonflow 工作区；**只让 ComfyUI 监听内网地址，不会自动使 Toonflow 识别任意工作流**。这是待实施的集成工作，不属于本文已完成事项。

复现按以下顺序进行：

1. 从[作者分享目录](https://pan.quark.cn/s/11cef250fa5f)下载 **H3→LTX 2.5 二采 JSON**、对应模型、适配器和无公开仓库的 `Comfyui-XH_Toolbox`，核对文件是否齐全；分享链接会过期，官方 H3／LTX 基础工作流也不能替代作者的组合工作流。
2. 在 3080 机器上对齐 ComfyUI 版本、节点包和模型路径，以 10 秒 768p、同一参考图和同一随机种子跑首个任务；记录各阶段耗时、峰值显存、峰值内存、是否发生磁盘交换及最终可播放文件。
3. 在 Mac 上分别验证 Z-Image-Turbo 文生图、Klein 单图编辑／多图参考，以及可选的 Krea 文生图；固定不超过 1K 的目标尺寸，区分首次加载与热机耗时，并用同一角色、场景、关键帧任务观察人物一致性与可修改性。
4. 先在 ComfyUI 内确认图片与视频工作流可用，再决定 Toonflow 提供方适配和批量任务的具体实现；不要把“模型能生成”当作“节点已能调用”。

## 商用发布边界

用户的目标是**发布 AI 短剧，通过付费观看与广告盈利**。这属于商业使用；即使不经营模型服务，也不能按“非商用”处理模型输出。

| 模型 | 当前公开协议对本场景的直接影响 |
| --- | --- |
| Z-Image-Turbo、FLUX.2 Klein 4B、HiDream-O1-Image | 分别采用 Apache 2.0、Apache 2.0、MIT，模型协议本身允许商业使用；仍须遵守各自协议及素材权利边界。[Z](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) · [Klein](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) · [HiDream](https://huggingface.co/HiDream-ai/HiDream-O1-Image) |
| Krea 2 Turbo | 协议将**输出用于营利**也列为商业使用；关联实体最近 12 个月全部收入低于 **100 万美元**才可按社区协议商用，达到门槛须事先取得企业授权。[协议第 1、2 节](https://www.krea.ai/krea-2-licensing) |
| MiniMax H3 | 社区协议通常允许年收入不超过 **2,000 万美元**的商业产品／服务使用，但另有**地域限制**：美国、欧盟、英国、韩国为排除地区；协议第 V 节还限制在这些地区使用、展示 H3 的输出或结果。面向这些地区发布短剧前应取得适用授权，不能只看收入门槛。[MiniMax 原协议](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE) · [Comfy 授权问答](https://comfy.org/minimax/license) |
| LTX 2.5 | [官方模型页](https://huggingface.co/Lightricks/LTX-2.5)说明，关联实体年收入低于 **1,000 万美元**可按 LTX-2.x Community License 免费商用；超过门槛需商业协议。 |

ComfyUI 的 [H3 教程](https://docs.comfy.org/tutorials/video/minimax/minimax-h3)概括为“本地商用输出需商业授权”，但 Comfy 自己的[授权问答](https://comfy.org/minimax/license)明确社区协议通常允许门槛内商用；本文以 [MiniMax 协议原文](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE)及其地域条款为准。若剧集会在排除地区上线，这一问题应在把 H3 设为正式产线前解决。
