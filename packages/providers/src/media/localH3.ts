const rules = [
  { type: "input", field: "baseUrl" as const, title: "服务地址", value: "http://127.0.0.1:8787", props: { placeholder: "http://127.0.0.1:8787" } },
  { type: "input", field: "apiKey" as const, title: "Bearer token", value: "", props: { type: "password", showPassword: true, autocomplete: "off" } },
] as const;

const sizes = ["512×512", "768×768", "1024×576", "576×1024", "1024×768", "768×1024"];
const maxOutputBytes = 100 * 1024 * 1024;
type Binding = NonNullable<VideoRequest["referenceBindings"]>[number];
type Reference = { kind: string; fileKey: string; audioFileKey?: string };

function bytes(input: MediaInput) {
  if (input.type === "binary") return input.data;
  if (input.type === "base64") return Uint8Array.from(Buffer.from(input.data.replace(/^data:[^;]+;base64,/, ""), "base64"));
  throw new Error("本地 H3 只接受已读取的工作区素材");
}

function wait(signal: AbortSignal | undefined) {
  signal?.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal?.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, 5000);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

async function checkedJson(context: ProviderContext, url: string, apiKey: string, init?: RequestInit) {
  const response = await context.tool.fetch(url, { ...init, headers: { Authorization: `Bearer ${apiKey}` } });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(`本地 H3 请求失败（HTTP ${response.status}）：${context.tool.errorMessage(result) || "请查看服务状态"}`);
  return result;
}

function bindingsFor(request: VideoRequest): Binding[] {
  if (request.referenceBindings) return request.referenceBindings;
  let number = 0;
  return [
    ...(request.images ?? []).map((_, index) => ({ number: ++number, type: "image" as const, index })),
    ...(request.videos ?? []).map((_, index) => ({ number: ++number, type: "video" as const, index, kind: "silentVideo" as const })),
    ...(request.audios ?? []).map((_, index) => ({ number: ++number, type: "audio" as const, index })),
  ];
}

function conditioning(request: VideoRequest, form: FormData) {
  const promptNames = new Map<number, string>();
  const usedKeys = new Set<string>();
  const upload = (input: MediaInput, fileKey: string) => {
    if (usedKeys.has(fileKey)) throw new Error("本地 H3 引用素材重复");
    usedKeys.add(fileKey);
    const source = bytes(input);
    const content = new Uint8Array(source.byteLength);
    content.set(source);
    form.append(fileKey, new Blob([content.buffer], { type: input.mimeType }), input.name?.split(/[\\/]/).at(-1) || `${fileKey}.bin`);
  };
  const bindings = bindingsFor(request);
  if (new Set(bindings.map(item => item.number)).size !== bindings.length) throw new Error("参考编号重复");
  for (const binding of bindings.filter(item => item.type === "text")) promptNames.set(binding.number, `参考 ${binding.number}`);
  const hasFrames = !!request.firstFrame || !!request.lastFrame;
  if (hasFrames) {
    if (request.images?.length || request.videos?.length || request.audios?.length) throw new Error("首尾帧不能与参考素材混用");
    if (request.firstFrame) upload(request.firstFrame, "firstFrame");
    if (request.lastFrame) upload(request.lastFrame, "lastFrame");
    const roles = new Set<string>();
    for (const item of bindings) {
      if (item.type === "text") continue;
      if (item.type !== "image" || !item.role || !(item.role === "firstFrame" ? request.firstFrame : request.lastFrame)) throw new Error("首尾帧引用绑定无效");
      if (roles.has(item.role)) throw new Error("首尾帧引用绑定重复");
      roles.add(item.role);
      promptNames.set(item.number, item.role === "firstFrame" ? "首帧" : "尾帧");
    }
    return { value: { ...(request.firstFrame ? { firstFrameFileKey: "firstFrame" } : {}), ...(request.lastFrame ? { lastFrameFileKey: "lastFrame" } : {}) }, promptNames };
  }
  const images = request.images ?? [];
  const videos = request.videos ?? [];
  const audios = request.audios ?? [];
  const used = { image: new Set<number>(), video: new Set<number>(), audio: new Set<number>() };
  const audioBindings = new Map(bindings.filter(item => item.type === "audio").map(item => [item.number, item]));
  const pairedAudio = new Set<number>();
  for (const binding of bindings.filter(item => item.type === "video" && item.kind === "videoWithAudio")) {
    const paired = audioBindings.get(binding.audioNumber ?? -1);
    if (!paired || paired.index === undefined || !audios[paired.index] || pairedAudio.has(paired.number)) throw new Error(`参考 ${binding.number} 未指定有效的配对音频`);
    pairedAudio.add(paired.number);
  }
  const references: Reference[] = [];
  let picture = 0;
  let video = 0;
  let audio = 0;
  for (const binding of bindings) {
    if (binding.type === "text" || (binding.type === "audio" && pairedAudio.has(binding.number))) continue;
    if (binding.role || binding.index === undefined) throw new Error(`参考 ${binding.number} 缺少素材位置`);
    const source = binding.type === "image" ? images : binding.type === "video" ? videos : audios;
    const input = source[binding.index];
    if (!input || used[binding.type].has(binding.index)) throw new Error(`参考 ${binding.number} 素材位置无效或重复`);
    used[binding.type].add(binding.index);
    const fileKey = `ref${binding.number}`;
    upload(input, fileKey);
    if (binding.type === "image") {
      picture++;
      references.push({ kind: "image", fileKey });
      promptNames.set(binding.number, `<Picture ${picture}>`);
    } else if (binding.type === "audio") {
      audio++;
      references.push({ kind: "audio", fileKey });
      promptNames.set(binding.number, `<Audio ${audio}>`);
    } else {
      video++;
      const kind = binding.kind ?? "silentVideo";
      if (!["silentVideo", "video", "videoWithAudio"].includes(kind)) throw new Error(`参考 ${binding.number} 视频声音模式无效`);
      const reference: Reference = { kind, fileKey };
      if (kind !== "silentVideo") audio++;
      if (kind === "videoWithAudio") {
        const paired = audioBindings.get(binding.audioNumber ?? -1);
        if (!paired || paired.index === undefined || !audios[paired.index] || used.audio.has(paired.index)) throw new Error(`参考 ${binding.number} 未指定有效的配对音频`);
        used.audio.add(paired.index);
        reference.audioFileKey = `ref${paired.number}`;
        upload(audios[paired.index]!, reference.audioFileKey);
        promptNames.set(paired.number, `<Audio ${audio}>`);
      }
      references.push(reference);
      promptNames.set(binding.number, `<Video ${video}>`);
    }
  }
  if (used.image.size !== images.length || used.video.size !== videos.length || used.audio.size !== audios.length) throw new Error("部分参考素材未绑定");
  if (references.length > 12 || picture > 9 || video > 3 || audio > 3) throw new Error("H3 最多支持 12 条参考、9 张图片、3 段视频和 3 路音频");
  if (audio && !picture && !video) throw new Error("独立音频需要与图片或视频参考一起使用");
  return { value: references.length ? { references } : undefined, promptNames };
}

async function download(context: ProviderContext, url: string, apiKey: string) {
  const response = await context.tool.fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok) throw new Error(`下载 H3 成品失败（HTTP ${response.status}）`);
  if (Number(response.headers.get("content-length")) > maxOutputBytes) throw new Error("H3 成品超过 Toonflow 的 100 MB 限制");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("H3 成品为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxOutputBytes) throw new Error("H3 成品超过 Toonflow 的 100 MB 限制");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  if (!size) throw new Error("H3 成品为空");
  return Buffer.concat(chunks, size);
}

export default {
  id: "localH3",
  label: "本地 MiniMax H3",
  icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSIxMiIgZmlsbD0iIzIwMjUyZCIvPjx0ZXh0IHg9IjI0IiB5PSIzMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZmZmZiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE5IiBmb250LXdlaWdodD0iNzAwIj5IMzwvdGV4dD48L3N2Zz4=",
  version: "1.0.0",
  readme: "连接独立的 minimax-h3-server。本地生成可能持续较久；停止节点等待不会终止服务端正在烧制的任务，成品仍可从服务管理后台获取。",
  rules,
  models: [{
    id: "MiniMax-H3", label: "MiniMax-H3（本地）", type: "video",
    mode: ["text", "endFrameOptional", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
    audio: true,
    durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: [] }],
    videoSizes: ["512×512", "768×768", "1024×576", "576×1024", "1024×768", "768×1024"],
    videoReferenceLimits: { total: 12, audioRequiresVisual: true },
    videoParameters: [
      { field: "seed", label: "Seed", type: "uint64", min: "0", max: "18446744073709551615" },
      { field: "steps", label: "Steps", type: "integer", min: 2, max: 1000 },
      { field: "layers", label: "Layers", type: "integer", min: 35, max: 50 },
      { field: "reuse", label: "Reuse", type: "integer", min: 1, max: 3 },
    ],
  }] satisfies ProviderModel[],
  async generateVideo(request: VideoRequest): Promise<MediaAsset[]> {
    const baseUrl = this.config.baseUrl?.trim().replace(/\/$/, "");
    const apiKey = this.config.apiKey?.trim();
    if (!baseUrl || !URL.canParse(baseUrl)) throw new Error("请填写有效的 H3 服务地址");
    const address = new URL(baseUrl);
    if (!["http:", "https:"].includes(address.protocol) || !address.host || address.username || address.password || address.pathname !== "/" || address.search || address.hash) throw new Error("H3 服务地址只能包含 HTTP(S) 主机和端口");
    if (!apiKey) throw new Error("请填写 H3 Bearer token");
    if (request.model !== "MiniMax-H3") throw new Error("本地 H3 模型 ID 无效");
    if (request.generateAudio === false) throw new Error("H3 固定生成音轨，不能关闭声音");
    const options = request.other ?? {};
    if (Object.keys(options).some(key => !["size", "seed", "steps", "layers", "reuse"].includes(key))) throw new Error("本地 H3 包含不支持的生成参数");
    const size = options.size ?? "512×512";
    if (typeof size !== "string" || !sizes.includes(size)) throw new Error("请选择本地 H3 支持的视频尺寸");
    const [width, height] = size.split("×").map(Number);
    const parameters: Record<string, string | number> = { width: width!, height: height!, coreReuse: 1 };
    if (request.duration !== undefined) {
      if (!Number.isInteger(request.duration) || request.duration < 2 || request.duration > 15) throw new Error("H3 时长须为 2 到 15 秒的整数");
      parameters.seconds = request.duration;
    }
    for (const [field, min, max] of [["steps", 2, 1000], ["layers", 35, 50], ["reuse", 1, 3]] as const) {
      const value = options[field];
      if (value === undefined) continue;
      if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) throw new Error(`${field} 须为 ${min} 到 ${max} 的整数`);
      parameters[field] = value;
    }
    if (options.seed !== undefined) {
      if (typeof options.seed !== "string" || !/^\d{1,20}$/.test(options.seed) || BigInt(options.seed) > 18446744073709551615n) throw new Error("seed 须为 0 到 2^64-1 的十进制字符串");
      parameters.seed = options.seed;
    }
    const form = new FormData();
    const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"].includes(String(request.mode));
    const hasFrames = !!request.firstFrame || !!request.lastFrame;
    if (frameMode && !hasFrames) throw new Error("当前首尾帧模式缺少图片");
    if (Array.isArray(request.mode) && hasFrames) throw new Error("首尾帧不能与有序参考模式混用");
    if (request.mode === "text" && (hasFrames || request.images?.length || request.videos?.length || request.audios?.length)) throw new Error("文生视频模式不能附带媒体参考");
    const { value, promptNames } = conditioning(request, form);
    const prompt = request.prompt.replace(/\{\{ref\s+(\d+)\}\}/g, (_match, rawNumber: string) => {
      const label = promptNames.get(Number(rawNumber));
      if (!label) throw new Error(`提示词引用 {{ref ${rawNumber}}} 不存在`);
      return label;
    });
    if (!prompt.trim()) throw new Error("请输入 H3 视频提示词");
    form.append("request", JSON.stringify({ prompt, parameters, ...(value ? { conditioning: value } : {}) }));
    const context = this as ProviderContext;
    const capabilities = await checkedJson(context, `${baseUrl}/v1/capabilities`, apiKey);
    const limits = capabilities.parameterRanges as Record<string, { min?: number; max?: number }> | undefined;
    for (const field of ["steps", "layers", "reuse"] as const) {
      const range = limits?.[field];
      if (range && parameters[field] !== undefined && (Number(parameters[field]) < (range.min ?? 0) || Number(parameters[field]) > (range.max ?? Infinity))) throw new Error(`${field} 超出 H3 服务当前允许范围`);
    }
    const task = await checkedJson(context, `${baseUrl}/v1/tasks`, apiKey, { method: "POST", body: form });
    const taskId = task.id;
    if (typeof taskId !== "string" || !/^[0-9a-f-]{36}$/i.test(taskId)) throw new Error("H3 服务未返回有效任务 ID");
    while (true) {
      this.signal?.throwIfAborted();
      const status = await checkedJson(context, `${baseUrl}/v1/tasks/${taskId}`, apiKey);
      if (status.status === "succeeded") break;
      if (status.status === "failed") throw new Error(typeof status.errorMessage === "string" ? status.errorMessage : "本地 H3 烧制失败");
      if (status.status !== "running" && status.status !== "preparing") throw new Error("H3 服务返回未知任务状态");
      await wait(this.signal);
    }
    return [{ mediaType: "video", type: "binary", data: await download(context, `${baseUrl}/v1/tasks/${taskId}/artifact`, apiKey), mimeType: "video/mp4" }];
  },
} satisfies ProviderDefinition<typeof rules>;
