<template>
  <nodeSkeleton
    v-bind="nodeProps"
    v-model:bottomVisible="node.selected"
    :topVisible="node.selected"
    topWidth="max-content"
    :downloadUrl="previewUrl"
    :downloadName="outputFile?.url.split(/[\\/]/).at(-1)"
    @fullscreen="player?.enterFullscreen()"
    :bottomWidth="660"
    :style="{ width: previewUrl && videoWidth ? `${videoWidth + 18}px` : undefined }">
    <template #topActions>
      <el-button :icon="IconMusic" text :disabled="!outputFile || generating || deleting || uploading || actions?.processing" @click.stop="actions?.open('extractAudio')">提取音轨</el-button>
      <el-button :icon="IconLayersSubtract" text :disabled="!outputFile || generating || deleting || uploading || actions?.processing" @click.stop="actions?.open('separate')">分离音视频</el-button>
      <el-button :icon="IconScissors" text :disabled="!outputFile || generating || deleting || uploading || actions?.processing" @click.stop="actions?.open('trim')">截取片段</el-button>
      <el-button :icon="IconMovie" text :loading="actions?.creatingAnalysis" :disabled="!outputFile || generating || deleting || uploading || actions?.processing || actions?.creatingAnalysis" @click.stop="actions?.createFrameAnalysis()">逐帧拉片</el-button>
      <mediaHistory mediaType="video" :current="outputFile" :disabled="generating || deleting || uploading" @select="outputs.video = { dataType: 'VIDEO', value: $event }" />
      <el-button :icon="IconTransfer" :loading="uploading" :disabled="generating || deleting" text title="替换视频" aria-label="替换视频" @click.stop="fileInput?.click()">替换视频</el-button>
      <input ref="fileInput" type="file" accept="video/*" hidden aria-label="选择替换视频" :disabled="generating || deleting || uploading" @change="replaceOutput" />
    </template>
    <template #topRightActions>
      <el-dropdown trigger="click" placement="bottom-end" :disabled="!player?.ready || player?.capturing || generating || deleting || uploading" @command="player?.captureFrame($event)">
        <el-button :icon="IconPhotoScan" :loading="player?.capturing" :disabled="!player?.ready || player?.capturing || generating || deleting || uploading" text title="截取视频帧" aria-label="截取视频帧" />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="current" :icon="IconPhotoScan">截取当前帧</el-dropdown-item>
            <el-dropdown-item command="first" :icon="IconPlayerSkipBack">截取首帧</el-dropdown-item>
            <el-dropdown-item command="last" :icon="IconPlayerSkipForward">截取尾帧</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </template>
    <div v-loading="generating || uploading" class="videoContent nopan" :aria-busy="generating || uploading">
      <videoPlayer
        v-if="previewUrl"
        ref="player"
        :src="previewUrl"
        label="生成视频"
        @loadedmetadata="resizeVideo" />
      <div v-else class="videoEmpty" role="img" aria-label="暂无生成视频">
        <icon-camera-ai :size="48" stroke="1.25" aria-hidden="true" />
      </div>
    </div>
    <template #bottom>
      <el-card class="promptCard" shadow="never" :bodyStyle="{ padding: '14px 16px 12px' }">
        <referenceItem
          v-if="refList.length"
          v-model="refList"
          @preview="setReferencePreview"
          @remove="removeReference" />
        <div v-if="selectedModel?.videoSizes?.length && videoReferences.length" class="videoReferenceOptions">
          <div v-for="item in videoReferences" :key="referenceKey(item.value)" class="videoReferenceOption">
            <span>参考 {{ item.number }} 视频声音</span>
            <el-select :modelValue="videoKind(item.value)" :disabled="generating || deleting" aria-label="视频参考声音模式" @update:modelValue="setVideoKind(item.value, $event)">
              <el-option label="仅参考画面" value="silentVideo" />
              <el-option label="保留原音轨" value="video" />
              <el-option label="搭配指定音频" value="videoWithAudio" />
            </el-select>
            <el-select v-if="videoKind(item.value) === 'videoWithAudio'" :modelValue="videoAudioNumber(item.value)" :disabled="generating || deleting" placeholder="选择音频参考" aria-label="配对音频参考" @update:modelValue="setVideoAudio(item.value, $event)">
              <el-option v-for="audio in audioReferences" :key="audio.number" :label="`参考 ${audio.number}`" :value="audio.number" />
            </el-select>
          </div>
        </div>
        <div v-if="frameMode" class="referenceHint">
          {{ selectedMode === "startFrameOptional" ? "仅一张图片时作为尾帧；两张图片按顺序作为首帧、尾帧" : "图片引用按顺序作为首帧、尾帧" }}
        </div>
        <promptInput v-model="data.promptModel" v-model:text="data.prompt" :references="referenceMentions" :materials="materialMentions" :selectMaterial="selectMaterialReference" :selectAsset="selectAssetReference" expandable />
        <div class="promptFooter">
          <el-select
            v-model="data.model"
            class="modelSelect"
            filterable
            :loading="modelsLoading"
            :disabled="generating || deleting"
            placeholder="选择模型"
            aria-label="生成模型"
            noDataText="请先在设置中添加视频模型"
            placement="top-start"
            @visible-change="(visible) => visible && loadModels().catch((error) => showNodeError(error, '模型读取失败'))">
            <template #prefix><icon-sparkles :size="17" /></template>
            <el-option-group v-for="provider in modelGroups" :key="provider.id" :label="provider.label">
              <el-option
                v-for="item in provider.models"
                :key="item.modelId"
                :label="item.label"
                :value="JSON.stringify([item.providerId, item.modelId])" />
            </el-option-group>
          </el-select>
          <generationSettings
            v-model:duration="data.duration"
            v-model:resolution="data.resolution"
            v-model:ratio="data.ratio"
            v-model:mode="data.mode"
            v-model:generateAudio="data.generateAudio"
            v-model:videoSize="data.videoSize"
            v-model:videoParameters="data.videoParameters"
            v-model:other="data.other"
            :ratios="ratioOptions"
            :model="selectedModel"
            :disabled="generating || deleting || !selectedModel" />
          <div class="generationActions">
            <mediaPrice v-if="generationInput" :input="{ ...generationInput, mediaType: 'video' }" :supported="selectedModel?.supportsPrice === true" />
            <el-button
              class="sendButton"
              :icon="generating ? IconPlayerStop : IconArrowUp"
              :disabled="deleting || uploading || (!generating && (!generationPrompt || !selectedModel))"
              :title="generating ? selectedModel?.videoSizes?.length ? '停止等待（本地烧制继续）' : '停止生成' : '生成视频'"
              :aria-label="generating ? selectedModel?.videoSizes?.length ? '停止等待（本地烧制继续）' : '停止生成' : '生成视频'"
              @click="generating ? generationController?.abort() : startGeneration().catch((error) => showNodeError(error, '视频生成失败'))" />
          </div>
        </div>
      </el-card>
    </template>
  </nodeSkeleton>
  <videoActions ref="actions" :file="outputFile" :src="previewUrl" :disabled="generating || deleting || uploading" />
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onScopeDispose, ref, shallowRef, watch } from "vue";
import { ElButton, ElCard, ElSelect, ElOption, ElOptionGroup, ElLoading, ElDropdown, ElDropdownMenu, ElDropdownItem } from "element-plus";
import { IconCameraAi, IconSparkles, IconArrowUp, IconPlayerStop, IconTransfer, IconMusic, IconLayersSubtract, IconScissors, IconMovie, IconPhotoScan, IconPlayerSkipBack, IconPlayerSkipForward } from "@tabler/icons-vue";
import { nodeSkeleton, nodeTools, useNode, z, type NodeMediaModel, type NodeVideoRequest, type NodeHandle, type NodeInputValue } from "@toonflow/nodes-scaffold/runtime";
import { groupNodeModels } from "@toonflow/node-shared/groupNodeModels";
import { showNodeError } from "@toonflow/node-shared/showNodeError";
import { useNodeGeneration } from "@toonflow/node-shared/useNodeGeneration";
import { useModelForm } from "@toonflow/node-shared/useModelForm";
import { useNodeReferences } from "@toonflow/node-shared/useNodeReferences";
import { getPromptText } from "@toonflow/node-shared/promptText";
import promptInput from "@toonflow/node-shared/promptInput";
import videoPlayer from "@toonflow/node-video/videoPlayer";
import videoActions from "@toonflow/node-video/videoActions";
import referenceItem from "@toonflow/node-shared/referenceItem";
import mediaHistory from "@toonflow/node-shared/mediaHistory";
import mediaPrice from "@toonflow/node-shared/mediaPrice";
import generationSettings from "./components/generationSettings.vue";

defineOptions({
  inheritAttrs: false,
  icon: IconCameraAi,
  handles: [
    { id: "in", type: "target", dataType: ["IMAGE", "VIDEO", "AUDIO", "STRING"], label: "图片、视频、音频、文本输入" },
    { id: "video", type: "source", dataType: "VIDEO", label: "视频输出" },
  ] satisfies NodeHandle[],
});
const vLoading = ElLoading.directive;
const { id, node, nodeProps, nodeEvent, outputs, files, ai, updateNodeInternals } = useNode({
  label: "视频生成",
});
type PromptModel = NonNullable<InstanceType<typeof promptInput>["$props"]["modelValue"]>;
type VideoKind = "silentVideo" | "video" | "videoWithAudio";
const data = computed(() => node.data as { prompt: string; promptModel: PromptModel; model: string; duration?: number; resolution: string; ratio: string; mode: string; generateAudio: boolean; other: Record<string, unknown>; videoSize: string; videoParameters: Record<string, string>; videoReferenceSettings: Record<string, { kind: VideoKind; audioKey?: string }> });
data.value.prompt ??= "";
data.value.promptModel ??= [];
data.value.model ??= "";
data.value.resolution ??= "";
data.value.mode ??= "";
data.value.generateAudio ??= true;
data.value.ratio ??= "9:16";
data.value.videoSize ??= "";
data.value.videoParameters ??= {};
data.value.videoReferenceSettings ??= {};
data.value.other ??= {};
const { refList, referenceMentions, materialMentions, selectMaterialReference, selectAssetReference, setReferencePreview, removeReference } = useNodeReferences();
const models = shallowRef<NodeMediaModel[]>([]);
const modelsLoading = ref(false);
const uploading = ref(false);
const fileInput = ref<HTMLInputElement>();
let disposed = false;
const deleting = ref(false);
const player = ref<InstanceType<typeof videoPlayer>>();
const actions = ref<InstanceType<typeof videoActions>>();
const videoWidth = ref(0);
let generationController: AbortController | undefined;
const generationState = useNodeGeneration(outputs, () => generationController?.abort());
const { generating } = generationState;
let generation: Promise<void> | undefined;
let modelsRequest: Promise<void> | undefined;
// ACT: 供应商未声明视频比例范围，沿用界面的通用比例，具体支持范围由供应商校验。
const ratioOptions = ["16:9", "9:16", "1:1", "4:3", "3:4"];
const selectedModel = computed(() => models.value.find((item) => JSON.stringify([item.providerId, item.modelId]) === data.value.model));
useModelForm(data, selectedModel);
const selectedMode = computed(() => selectedModel.value?.mode?.find((item) => JSON.stringify(item) === data.value.mode) as NodeVideoRequest["mode"]);
const frameMode = computed(() => ["startEndRequired", "endFrameOptional", "startFrameOptional"].includes(String(selectedMode.value)));
const videoReferences = computed(() => refList.value.flatMap((item, index) => item.dataType === "VIDEO" ? [{ value: item, number: index + 1 }] : []));
const audioReferences = computed(() => refList.value.flatMap((item, index) => item.dataType === "AUDIO" ? [{ value: item, number: index + 1 }] : []));

function referenceKey(item: NodeInputValue) { return JSON.stringify([item.source, item.sourceHandle]); }
function videoKind(item: NodeInputValue): VideoKind { return data.value.videoReferenceSettings[referenceKey(item)]?.kind ?? "silentVideo"; }
function videoAudioNumber(item: NodeInputValue) {
  const audioKey = data.value.videoReferenceSettings[referenceKey(item)]?.audioKey;
  return audioReferences.value.find(audio => referenceKey(audio.value) === audioKey)?.number;
}
function setVideoKind(item: NodeInputValue, kind: string) {
  if (kind !== "silentVideo" && kind !== "video" && kind !== "videoWithAudio") return;
  data.value.videoReferenceSettings[referenceKey(item)] = { kind };
}
function setVideoAudio(item: NodeInputValue, audioNumber: string | number) {
  const number = Number(audioNumber);
  if (!Number.isInteger(number) || number < 1) return;
  const audio = audioReferences.value.find(item => item.number === number);
  if (!audio) return;
  data.value.videoReferenceSettings[referenceKey(item)] = { kind: "videoWithAudio", audioKey: referenceKey(audio.value) };
}
const mediaCounts = computed(() => ({
  image: refList.value.filter((item) => item.dataType === "IMAGE").length,
  video: refList.value.filter((item) => item.dataType === "VIDEO").length,
  audio: refList.value.filter((item) => item.dataType === "AUDIO").length,
}));
const matchingModes = computed(() => getMatchingModes(selectedModel.value));

function getMatchingModes(choice?: NodeMediaModel) {
  return (choice?.mode ?? []).filter((mode) => {
    const { image, video, audio } = mediaCounts.value;
    const pairedAudio = new Set(videoReferences.value.flatMap(item => videoKind(item.value) === "videoWithAudio" ? [videoAudioNumber(item.value)] : []).filter((number): number is number => number !== undefined)).size;
    if (Array.isArray(mode)) return image + video + audio > 0
      && (!choice?.videoReferenceLimits || (image + video + audio - pairedAudio <= choice.videoReferenceLimits.total
        && (!choice.videoReferenceLimits.audioRequiresVisual || !audio || image + video > 0)))
      && Object.entries(mediaCounts.value).every(([type, count]) =>
      count <= Number(mode.find((item) => item.startsWith(`${type}Reference:`))?.split(":")[1] ?? 0)
    );
    if (mode === "text") return image + video + audio === 0;
    if (video || audio) return false;
    if (mode === "singleImage") return image === 1;
    if (mode === "startEndRequired") return image === 2;
    return ["endFrameOptional", "startFrameOptional"].includes(mode) && image >= 1 && image <= 2;
  });
}

function getDurations(choice: NodeMediaModel) {
  return [...new Set((choice.durationResolutionMap ?? []).flatMap((item) => item.duration))].sort((a, b) => a - b);
}

function getResolutions(choice: NodeMediaModel, duration?: number) {
  // ACT: 当前视频分辨率使用 p 单位；出现其他单位时再统一换算。
  return [...new Set((choice.durationResolutionMap ?? []).filter((item) => item.duration.includes(duration!)).flatMap((item) => item.resolution))]
    .sort((left, right) => (Number.parseFloat(left) || Infinity) - (Number.parseFloat(right) || Infinity));
}
// ACT: 引用改变时只替换不适用的模式；普通媒体优先作为参考，避免自动变成首尾帧。
watch([selectedModel, matchingModes, () => data.value.mode], ([choice, matches]) => {
  if (!choice || matches.some((item) => JSON.stringify(item) === data.value.mode)) return;
  const modes = choice.mode ?? [];
  const mode = matches.find(Array.isArray) ?? matches.find((item) => item === "singleImage")
    ?? matches.find((item) => item === "endFrameOptional") ?? matches[0]
    ?? modes.find((item) => JSON.stringify(item) === data.value.mode) ?? modes.find(Array.isArray) ?? modes[0];
  data.value.mode = mode === undefined ? "" : JSON.stringify(mode);
}, { flush: "sync" });
// ACT: 参数在节点内归一化，未选中、未挂载底部设置时也可由 Agent 直接生成。
watch([selectedModel, () => data.value.duration], ([choice]) => {
  if (!choice) return;
  const durations = getDurations(choice);
  if (!durations.includes(data.value.duration!)) data.value.duration = durations[0];
  const resolutions = getResolutions(choice, data.value.duration);
  if (!resolutions.includes(data.value.resolution)) data.value.resolution = resolutions[0] ?? "";
  if (!ratioOptions.includes(data.value.ratio)) data.value.ratio = "9:16";
  if (choice.videoSizes?.length && !choice.videoSizes.includes(data.value.videoSize)) data.value.videoSize = choice.videoSizes[0]!;
  if (choice.audio !== "optional") data.value.generateAudio = choice.audio === true;
}, { flush: "sync" });
const modelGroups = computed(() => groupNodeModels(models.value));
function getGenerationPrompt(prompt: string, references = refList.value) {
  return [
    prompt.trim(),
    ...references.flatMap((item, index) => (item.dataType === "STRING" && item.value?.trim() ? [`参考 ${index + 1}：\n${item.value.trim()}`] : [])),
  ]
    .filter(Boolean)
    .join("\n\n");
}
const generationPrompt = computed(() => getGenerationPrompt(data.value.prompt));
const generationInput = computed(() => getGenerationInput(data.value.prompt));

function videoOptions(choice: NodeMediaModel) {
  const other: Record<string, unknown> = { ...data.value.other };
  if (choice.videoSizes?.length) other.size = data.value.videoSize || choice.videoSizes[0]!;
  for (const item of choice.videoParameters ?? []) {
    const raw = data.value.videoParameters[item.field]?.trim();
    if (raw) other[item.field] = item.type === "integer" ? Number(raw) : raw;
  }
  return Object.keys(other).length ? other : undefined;
}

function validateVideoOptions(choice: NodeMediaModel, size = data.value.videoSize, parameters = data.value.videoParameters) {
  if (choice.videoSizes?.length && !choice.videoSizes.includes(size)) throw new Error("请选择当前模型支持的输出尺寸");
  for (const item of choice.videoParameters ?? []) {
    const raw = parameters[item.field]?.trim();
    if (!raw) continue;
    if (!/^\d+$/.test(raw)) throw new Error(`${item.label} 须为非负整数`);
    if (item.type === "uint64") {
      if (BigInt(raw) < BigInt(item.min) || BigInt(raw) > BigInt(item.max)) throw new Error(`${item.label} 超出允许范围`);
    } else if (!Number.isSafeInteger(Number(raw)) || Number(raw) < Number(item.min) || Number(raw) > Number(item.max)) {
      throw new Error(`${item.label} 超出允许范围`);
    }
  }
}

function validateVideoReferences(choice: NodeMediaModel, settings = data.value.videoReferenceSettings) {
  if (!choice.videoReferenceLimits) return;
  const audioKeys = new Set(audioReferences.value.map(item => referenceKey(item.value)));
  const paired = new Set<string>();
  let audioCount = audioReferences.value.length;
  for (const item of videoReferences.value) {
    const setting = settings[referenceKey(item.value)];
    if (!setting || setting.kind === "silentVideo") continue;
    if (setting.kind === "videoWithAudio") {
      if (!setting.audioKey || !audioKeys.has(setting.audioKey) || paired.has(setting.audioKey)) throw new Error(`视频参考 ${item.number} 需要选择未被占用的音频参考`);
      paired.add(setting.audioKey);
    } else if (setting.kind !== "video") throw new Error(`视频参考 ${item.number} 声音模式无效`);
    else audioCount++;
  }
  const audioLimit = Number((choice.mode?.find(Array.isArray) as string[] | undefined)?.find(item => item.startsWith("audioReference:"))?.split(":")[1] ?? 0);
  if (audioCount > audioLimit) throw new Error(`H3 最多接收 ${audioLimit} 路参考音频`);
}

function referenceBindings(): NodeVideoRequest["referenceBindings"] {
  const indexes = { image: 0, video: 0, audio: 0 };
  return refList.value.flatMap<NonNullable<NodeVideoRequest["referenceBindings"]>[number]>((item, index) => {
    const number = index + 1;
    if (item.dataType === "STRING") return [{ number, type: "text" as const }];
    const type = item.dataType === "IMAGE" ? "image" : item.dataType === "VIDEO" ? "video" : item.dataType === "AUDIO" ? "audio" : undefined;
    if (!type) return [];
    const position = indexes[type]++;
    if (type === "image" && frameMode.value) return [{ number, type, role: selectedMode.value === "startFrameOptional" && mediaCounts.value.image === 1 ? "lastFrame" as const : position === 0 ? "firstFrame" as const : "lastFrame" as const }];
    if (type === "video") {
      const setting = data.value.videoReferenceSettings[referenceKey(item)];
      const audioNumber = videoAudioNumber(item);
      return [{ number, type, index: position, kind: setting?.kind ?? "silentVideo", ...(audioNumber ? { audioNumber } : {}) }];
    }
    return [{ number, type, index: position }];
  });
}

function getGenerationInput(prompt: string): Omit<NodeVideoRequest, "directory"> | undefined {
  const choice = selectedModel.value;
  if (!choice) return;
  const references = refList.value;
  const images: NonNullable<NodeVideoRequest["images"]> = [];
  const videos: NonNullable<NodeVideoRequest["videos"]> = [];
  const audios: NonNullable<NodeVideoRequest["audios"]> = [];
  const referenceOrder: NonNullable<NodeVideoRequest["referenceOrder"]> = references.map(item => {
    if (item.dataType === "IMAGE" && item.value) {
      const index = images.push({ path: item.value.url, mimeType: item.value.mimeType }) - 1;
      return { type: "image", index };
    }
    if (item.dataType === "VIDEO" && item.value) {
      const index = videos.push({ path: item.value.url, mimeType: item.value.mimeType }) - 1;
      return { type: "video", index };
    }
    if (item.dataType === "AUDIO" && item.value) {
      const index = audios.push({ path: item.value.url, mimeType: item.value.mimeType }) - 1;
      return { type: "audio", index };
    }
    return { type: "text" };
  });
  const firstFrame = frameMode.value && (selectedMode.value !== "startFrameOptional" || images.length > 1) ? images[0] : undefined;
  const lastFrame = frameMode.value ? images[selectedMode.value === "startFrameOptional" && images.length === 1 ? 0 : 1] : undefined;
  return {
    providerId: choice.providerId,
    modelId: choice.modelId,
    prompt: getGenerationPrompt(prompt, references),
    mode: selectedMode.value,
    duration: data.value.duration,
    resolution: choice.videoSizes?.length ? undefined : data.value.resolution || undefined,
    ratio: choice.videoSizes?.length ? undefined : data.value.ratio,
    other: videoOptions(choice),
    referenceBindings: choice.videoSizes?.length ? referenceBindings() : undefined,
    generateAudio: choice.audio === "optional" ? data.value.generateAudio : choice.audio,
    outputDirectory: `assets/${id}`,
    images: frameMode.value ? undefined : images,
    firstFrame,
    lastFrame,
    videos,
    audios,
    referenceOrder: referenceOrder.map(reference => frameMode.value && reference.type === "image"
      ? { type: reference.index === 0 && firstFrame ? "firstFrame" : "lastFrame" } : reference),
  };
}
const outputFile = computed(() => outputs.value.video?.dataType === "VIDEO" ? outputs.value.video.value : undefined);
const previewUrl = files.useFileUrl(
  outputFile,
  (error) => showNodeError(error, "视频读取失败")
);

onMounted(() => {
  window.addEventListener("toonflow:plugin-installed", refreshProviderModels);
  window.addEventListener("toonflow:provider-config-changed", refreshProviderModels);
  void loadModels().catch(error => { if (!disposed) showNodeError(error, "模型读取失败"); });
});
onScopeDispose(() => {
  disposed = true;
  window.removeEventListener("toonflow:plugin-installed", refreshProviderModels);
  window.removeEventListener("toonflow:provider-config-changed", refreshProviderModels);
  generationController?.abort();
});

async function refreshProviderModels(event: Event) {
  if (event.type === "toonflow:plugin-installed" && (event as CustomEvent<{ type?: string }>).detail?.type !== "provider") return;
  try {
    await generation;
    if (!disposed && !deleting.value) await loadModels();
  } catch (error) {
    if (!disposed) showNodeError(error, "模型读取失败");
  }
}

async function replaceOutput(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || generating.value || deleting.value || uploading.value || disposed) return;
  if (!file.type.startsWith("video/")) return void showNodeError("请选择视频文件", "视频替换失败");
  if (!file.size || file.size > 100 * 1024 * 1024) return void showNodeError("视频不能为空且不能超过 100 MB", "视频替换失败");
  uploading.value = true;
  try {
    const workspace = files.getWorkspaceFiles();
    const url = await files.uploadFile(file);
    if (disposed) {
      await workspace.remove(url);
      return;
    }
    // ACT: 保留历史输出文件，避免破坏撤销记录和复制节点的引用。
    outputs.value.video = { dataType: "VIDEO", value: { url, mimeType: file.type } };
  } catch (error) {
    showNodeError(error, "视频替换失败");
  } finally {
    uploading.value = false;
  }
}

function loadModels() {
  if (modelsRequest) return modelsRequest;
  modelsLoading.value = true;
  modelsRequest = ai.getMediaModels().then((items) => {
    if (disposed || generating.value || deleting.value) return;
    models.value = items.filter((item) => item.type === "video");
    // ACT: 只给空配置选默认模型，保留暂时不可用的旧选择及其参数。
    if (!data.value.model) {
      const first = models.value[0];
      data.value.model = first ? JSON.stringify([first.providerId, first.modelId]) : "";
    }
  }).finally(() => {
    modelsLoading.value = false;
    modelsRequest = undefined;
  });
  return modelsRequest;
}

async function startGeneration() {
  const choice = selectedModel.value;
  if (generating.value) throw new Error("视频正在生成，请等待完成");
  if (uploading.value) throw new Error("视频正在替换，请等待完成");
  if (deleting.value) throw new Error("节点正在删除");
  // ACT: 提交时按稳定 ID 解析，避免依赖编辑器挂载及异步重排同步。
  const references = referenceMentions.value;
  const prompt = data.value.promptModel.length ? getPromptText(data.value.promptModel, referenceId => {
    const value = references.find(reference => reference.id === referenceId)?.value;
    if (value === undefined) throw new Error("提示词引用的素材已失效，请重新选择引用");
    return value;
  }) : data.value.prompt;
  const input = getGenerationInput(prompt);
  if (!choice || !input) throw new Error("请先选择视频模型");
  if (!input.prompt) throw new Error("请输入生成提示词");
  if (refList.value.some(item => item.value === undefined)) throw new Error("引用节点暂无内容，请先补充引用内容");
  for (const match of input.prompt.matchAll(/\{\{ref (\d+)\}\}/g)) {
    const reference = refList.value[Number(match[1]) - 1];
    if (reference?.dataType === "STRING" && !reference.value?.trim()) throw new Error(`参考 ${match[1]} 的文本为空，请补充内容或移除提示词中的引用`);
  }
  if (choice.mode?.length && !matchingModes.value.length) throw new Error("当前模型没有适合这些参考素材的生成模式，请更换模型或调整引用");
  validateVideoOptions(choice);
  validateVideoReferences(choice);
  const workspace = files.getWorkspaceFiles();
  const controller = new AbortController();
  generationController = controller;
  // ACT: 工具立即返回，任务由节点持有，停止或卸载时取消。
  generation = generationState.run(() => workspace
    .list()
    .then(({ directory }) => {
      controller.signal.throwIfAborted();
      return ai.generateVideo({ ...input, directory }, controller.signal);
    })
    .then(([result]) => {
      controller.signal.throwIfAborted();
      if (!result) throw new Error("供应商未返回视频");
      outputs.value.video = { dataType: "VIDEO", value: { url: result.path, mimeType: result.mimeType } };
    }))
    .catch((error) => showNodeError(error, "视频生成失败"))
    .finally(() => {
      generationController = undefined;
    });
  return { status: "generating" };
}

nodeEvent.on("save", (reason) => {
  if (reason === "reload" && (generating.value || uploading.value || deleting.value)) throw new Error("视频处理中，请完成后再刷新节点");
});
nodeEvent.on("delete", async () => {
  if (uploading.value) throw new Error("视频正在替换，请稍后删除节点");
  deleting.value = true;
  generationController?.abort();
  try {
    await generation;
    await files.removeNodeFiles();
  } finally {
    deleting.value = false;
  }
});

async function resizeVideo(event: Event) {
  const video = event.currentTarget as HTMLVideoElement;
  if (!video.videoWidth || !video.videoHeight) return;
  videoWidth.value = Math.max(180, (240 * video.videoWidth) / video.videoHeight);
  await nextTick();
  updateNodeInternals();
}

function getConfig() {
  return {
    config: {
      providerId: selectedModel.value?.providerId ?? "",
      modelId: selectedModel.value?.modelId ?? "",
      duration: data.value.duration,
      resolution: selectedModel.value?.videoSizes?.length ? undefined : data.value.resolution,
      ratio: selectedModel.value?.videoSizes?.length ? undefined : data.value.ratio,
      mode: selectedMode.value,
      generateAudio: data.value.generateAudio,
      videoSize: data.value.videoSize,
      videoParameters: data.value.videoParameters,
      videoReferences: videoReferences.value.map(item => ({ number: item.number, kind: videoKind(item.value), audioNumber: videoAudioNumber(item.value) })),
      other: data.value.other,
    },
    models: models.value,
    ratios: ratioOptions,
    matchingModes: matchingModes.value,
  };
}

nodeTools.register({
  name: "getConfig",
  description: "读取此视频生成节点的当前配置、可选视频模型能力、通用比例及适合当前引用的模式，不含密钥；H3 尺寸见 videoSizes，逐任务参数见 videoParameters",
  parameters: z.strictObject({}),
  async execute(_args, { signal }) {
    signal?.throwIfAborted();
    await loadModels();
    signal?.throwIfAborted();
    return getConfig();
  },
});

nodeTools.register({
  name: "setConfig",
  description: "修改此视频生成节点的模型、时长、分辨率、比例、模式、声音、可选尺寸、逐任务参数或视频参考声音模式；先用 getConfig 查询能力，providerId 与 modelId 必须同时提供；mode 使用返回的原始字符串或数组，须匹配当前引用；不修改提示词、不启动生成",
  parameters: z.strictObject({
    providerId: z.string().min(1).optional(),
    modelId: z.string().min(1).optional(),
    duration: z.number().positive().optional(),
    resolution: z.string().min(1).optional(),
    ratio: z.enum(ratioOptions).optional(),
    mode: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    generateAudio: z.boolean().optional(),
    videoSize: z.string().min(1).optional(),
    videoParameters: z.record(z.string(), z.string()).optional(),
    videoReferences: z.array(z.strictObject({ number: z.number().int().positive(), kind: z.enum(["silentVideo", "video", "videoWithAudio"]), audioNumber: z.number().int().positive().optional() })).optional(),
  }).refine((args) => (args.providerId === undefined) === (args.modelId === undefined), "providerId 与 modelId 必须同时提供"),
  async execute(args, { signal }) {
    signal?.throwIfAborted();
    if (generating.value || deleting.value) throw new Error("节点正在生成或删除，请稍后修改配置");
    await loadModels();
    signal?.throwIfAborted();
    if (generating.value || deleting.value) throw new Error("节点正在生成或删除，请稍后修改配置");
    const choice = args.modelId === undefined ? selectedModel.value
      : models.value.find((item) => item.providerId === args.providerId && item.modelId === args.modelId);
    if (!choice) throw new Error("请选择 getConfig 返回的有效视频模型");
    if (choice.videoSizes?.length && (args.resolution !== undefined || args.ratio !== undefined)) throw new Error("当前模型通过 videoSize 选择宽高，不使用分辨率或比例字段");
    const durations = getDurations(choice);
    if (args.duration !== undefined && !durations.includes(args.duration)) throw new Error(`当前模型不支持时长 ${args.duration}，可选：${durations.join("、")}`);
    const duration = args.duration ?? (durations.includes(data.value.duration!) ? data.value.duration : durations[0]);
    const resolutions = getResolutions(choice, duration);
    if (args.resolution !== undefined && !resolutions.includes(args.resolution)) throw new Error(`当前时长不支持分辨率 ${args.resolution}，可选：${resolutions.join("、")}`);
    const resolution = args.resolution ?? (resolutions.includes(data.value.resolution) ? data.value.resolution : resolutions[0] ?? "");
    if (args.mode !== undefined && !getMatchingModes(choice).some((item) => JSON.stringify(item) === JSON.stringify(args.mode))) throw new Error("所选模式不受当前模型支持或不适用于当前引用，请根据模型能力及已连接素材选择");
    if (args.generateAudio !== undefined && choice.audio !== "optional" && args.generateAudio !== (choice.audio === true)) throw new Error("当前模型不支持切换声音，请查看 getConfig 返回的 audio 能力");
    const videoSize = args.videoSize ?? (choice.videoSizes?.includes(data.value.videoSize) ? data.value.videoSize : choice.videoSizes?.[0] ?? "");
    const videoParameters = args.videoParameters ?? data.value.videoParameters;
    if (args.videoSize !== undefined && !choice.videoSizes?.length) throw new Error("当前模型不支持独立视频尺寸");
    if (args.videoParameters !== undefined && !choice.videoParameters?.length) throw new Error("当前模型不支持逐任务视频参数");
    if (args.videoParameters && Object.keys(args.videoParameters).some(field => !choice.videoParameters?.some(item => item.field === field))) throw new Error("当前模型不支持所填视频参数");
    validateVideoOptions(choice, videoSize, videoParameters);
    const nextVideoReferences = { ...data.value.videoReferenceSettings };
    if (args.videoReferences !== undefined) {
      if (!choice.videoReferenceLimits) throw new Error("当前模型不支持视频参考声音配置");
      const numbers = new Set<number>();
      for (const setting of args.videoReferences) {
        if (numbers.has(setting.number)) throw new Error("视频参考编号重复");
        numbers.add(setting.number);
        const item = videoReferences.value.find(item => item.number === setting.number);
        if (!item) throw new Error(`视频参考 ${setting.number} 不存在`);
        const audio = audioReferences.value.find(item => item.number === setting.audioNumber);
        nextVideoReferences[referenceKey(item.value)] = { kind: setting.kind, ...(audio ? { audioKey: referenceKey(audio.value) } : {}) };
      }
      validateVideoReferences(choice, nextVideoReferences);
    }
    data.value.model = JSON.stringify([choice.providerId, choice.modelId]);
    data.value.duration = duration;
    data.value.resolution = resolution;
    if (args.ratio !== undefined) data.value.ratio = args.ratio;
    if (args.mode !== undefined) data.value.mode = JSON.stringify(args.mode);
    if (args.generateAudio !== undefined) data.value.generateAudio = args.generateAudio;
    data.value.videoSize = videoSize;
    if (args.videoParameters !== undefined) data.value.videoParameters = videoParameters;
    if (args.videoReferences !== undefined) data.value.videoReferenceSettings = nextVideoReferences;
    return getConfig();
  },
});

nodeTools.register({
  name: "setPrompt",
  description: "修改此节点的视频生成提示词，支持 {{ref 1}} 等参考标记；只修改提示词，不启动生成",
  parameters: z.strictObject({ prompt: z.string() }),
  execute({ prompt: value }) {
    if (deleting.value) throw new Error("节点正在删除，请稍后修改");
    data.value.prompt = value;
    data.value.promptModel = value.split("\n").map((text) => [{ type: "Write", text }]);
    return { prompt: value };
  },
});

nodeTools.register({
  name: "generateVideo",
  description: "启动此节点的后台视频生成，使用当前提示词、模型、模式、时长、尺寸、逐任务参数和参考素材；立即返回已开始，用 getGenerationStatus 查询完成结果。本地 H3 的 cancelGeneration 只停止 Toonflow 等待，服务端烧制继续",
  parameters: z.strictObject({}),
  execute(_args, { signal }) {
    signal?.throwIfAborted();
    return startGeneration();
  },
});
</script>

<style scoped lang="scss">
.videoContent {
  .nodeSkeleton.resized & {
    height: 100%;
    min-height: 0;
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
    --nodeMediaHeight: 100%;

    .videoEmpty { min-height: 0; height: 100%; }
  }

  position: relative;
  display: grid;
  place-items: center;
  min-height: 144px;
  overflow: hidden;
  border-radius: var(--el-border-radius-base);

  .videoEmpty {
    display: grid;
    place-items: center;
    min-height: 144px;
    color: var(--el-text-color-placeholder);
  }

  :deep(.el-loading-mask) {
    pointer-events: none;
  }

}

.promptCard {
  .videoReferenceOptions {
    margin: 8px 0;

    .videoReferenceOption {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;

      > span { flex-shrink: 0; }
      > .el-select { width: 150px; }
    }
  }

  .referenceHint {
    margin: 8px 0;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  .promptFooter {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;

    .modelSelect {
      width: 190px;
      min-width: 0;

      &:deep(.el-select__wrapper) {
        gap: 6px;
        padding: 0;
        box-shadow: none;
        background: transparent;
      }
    }

    .generationActions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;

      .sendButton {
        width: 32px;
        height: 32px;
        margin-left: 0;
        padding: 0;
        --el-button-bg-color: var(--el-text-color-primary);
        --el-button-border-color: transparent;
        --el-button-text-color: var(--el-bg-color);
        --el-button-hover-bg-color: var(--el-text-color-regular);
        --el-button-hover-border-color: transparent;
        --el-button-hover-text-color: var(--el-bg-color);
      }
    }
  }
}
</style>
