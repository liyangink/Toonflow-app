type Workflow = Record<string, { class_type: string; inputs: Record<string, unknown> }>;
type ComfyTask = { promptId: string; mediaType: "image" | "video"; outputNode: string; server: string };
type ReferencedVideoRequest = VideoRequest & {
  referenceOrder?: ({ type: "image" | "video" | "audio"; index: number } | { type: "firstFrame" | "lastFrame" | "text" })[];
};

// 工作流内嵌，供应商导入及打包后不依赖本机路径或外部模块。
const workflows: Record<string, Workflow> = {
  "qwenImage21T2i": {
    "13": {
      "class_type": "ResolutionSelector",
      "inputs": {
        "aspect_ratio": "1:1 (Square)",
        "megapixels": 2,
        "multiple": 8
      }
    },
    "461": {
      "class_type": "SaveImageAdvanced",
      "inputs": {
        "filename_prefix": "Qwen_image_2.1",
        "format": "png",
        "format.bit_depth": "8-bit",
        "format.input_color_space": "sRGB",
        "images": [
          "459:457",
          0
        ]
      }
    },
    "491": {
      "class_type": "easy cleanGpuUsed",
      "inputs": {
        "anything": [
          "461",
          0
        ]
      }
    },
    "459:457": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": [
          "459:486",
          0
        ],
        "vae": [
          "459:454",
          0
        ]
      }
    },
    "459:486": {
      "class_type": "SamplerCustomAdvanced",
      "inputs": {
        "noise": [
          "459:488",
          0
        ],
        "guider": [
          "459:489",
          0
        ],
        "sampler": [
          "459:487",
          0
        ],
        "sigmas": [
          "459:484",
          0
        ],
        "latent_image": [
          "459:456",
          0
        ]
      }
    },
    "459:488": {
      "class_type": "RandomNoise",
      "inputs": {
        "noise_seed": 324060311700261
      }
    },
    "459:489": {
      "class_type": "CFGGuider",
      "inputs": {
        "cfg": 1,
        "model": [
          "459:490",
          0
        ],
        "positive": [
          "459:452",
          0
        ],
        "negative": [
          "459:452",
          1
        ]
      }
    },
    "459:490": {
      "class_type": "QwenImage21Cache",
      "inputs": {
        "device": "auto",
        "dtype": "default",
        "model": [
          "459:451",
          0
        ]
      }
    },
    "459:451": {
      "class_type": "UNETLoader",
      "inputs": {
        "unet_name": "qwen_image_2.1_turbo_int8_convrot.safetensors",
        "weight_dtype": "default"
      }
    },
    "459:452": {
      "class_type": "TextEncodeQwenImage21",
      "inputs": {
        "prompt": "",
        "negative_prompt": "",
        "resolution": 1024,
        "clip": [
          "459:453",
          0
        ]
      }
    },
    "459:453": {
      "class_type": "CLIPLoader",
      "inputs": {
        "clip_name": "qwen3vl_8b_int8_convrot.safetensors",
        "type": "qwen_image",
        "device": "default"
      }
    },
    "459:487": {
      "class_type": "KSamplerSelect",
      "inputs": {
        "sampler_name": "euler"
      }
    },
    "459:484": {
      "class_type": "ManualSigmas",
      "inputs": {
        "sigmas": "1.0, 0.978453, 0.95418, 0.926626, 0.89508, 0.845148, 0.704534, 0.414568, 0"
      }
    },
    "459:456": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "width": [
          "13",
          0
        ],
        "height": [
          "13",
          1
        ],
        "batch_size": 1
      }
    },
    "459:454": {
      "class_type": "VAELoader",
      "inputs": {
        "vae_name": "qwen_image_2.1_vae_bf16.safetensors"
      }
    }
  },
  "qwenImage21Edit": {
    "461": {
      "class_type": "SaveImageAdvanced",
      "inputs": {
        "filename_prefix": "Qwen_image_2.1",
        "format": "png",
        "format.bit_depth": "8-bit",
        "format.input_color_space": "sRGB",
        "images": [
          "459:457",
          0
        ]
      }
    },
    "470": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "508": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "509": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "510": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "511": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "512": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "513": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "514": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "515": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "519": {
      "class_type": "easy cleanGpuUsed",
      "inputs": {
        "anything": [
          "461",
          0
        ]
      }
    },
    "459:457": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": [
          "459:505",
          0
        ],
        "vae": [
          "459:454",
          0
        ]
      }
    },
    "459:505": {
      "class_type": "SamplerCustomAdvanced",
      "inputs": {
        "noise": [
          "459:504",
          0
        ],
        "guider": [
          "459:507",
          0
        ],
        "sampler": [
          "459:503",
          0
        ],
        "sigmas": [
          "459:502",
          0
        ],
        "latent_image": [
          "459:468",
          0
        ]
      }
    },
    "459:504": {
      "class_type": "RandomNoise",
      "inputs": {
        "noise_seed": 891836227295375
      }
    },
    "459:507": {
      "class_type": "CFGGuider",
      "inputs": {
        "cfg": 1,
        "model": [
          "459:469",
          0
        ],
        "positive": [
          "459:474",
          0
        ],
        "negative": [
          "459:474",
          1
        ]
      }
    },
    "459:469": {
      "class_type": "QwenImage21Cache",
      "inputs": {
        "device": "auto",
        "dtype": "default",
        "model": [
          "459:451",
          0
        ]
      }
    },
    "459:451": {
      "class_type": "UNETLoader",
      "inputs": {
        "unet_name": "qwen_image_2.1_turbo_int8_convrot.safetensors",
        "weight_dtype": "default"
      }
    },
    "459:474": {
      "class_type": "TextEncodeQwenImage21",
      "inputs": {
        "prompt": "",
        "negative_prompt": "",
        "resolution": 0,
        "clip": [
          "459:453",
          0
        ],
        "images.image_1": [
          "470",
          0
        ],
        "vae": [
          "459:454",
          0
        ],
        "images.image_2": [
          "508",
          0
        ],
        "images.image_3": [
          "509",
          0
        ],
        "images.image_4": [
          "510",
          0
        ],
        "images.image_5": [
          "511",
          0
        ],
        "images.image_6": [
          "512",
          0
        ],
        "images.image_7": [
          "513",
          0
        ],
        "images.image_8": [
          "513",
          0
        ],
        "images.image_9": [
          "514",
          0
        ],
        "images.image_10": [
          "515",
          0
        ]
      }
    },
    "459:453": {
      "class_type": "CLIPLoader",
      "inputs": {
        "clip_name": "qwen3vl_8b_int8_convrot.safetensors",
        "type": "qwen_image",
        "device": "default"
      }
    },
    "459:454": {
      "class_type": "VAELoader",
      "inputs": {
        "vae_name": "qwen_image_2.1_vae_bf16.safetensors"
      }
    },
    "459:503": {
      "class_type": "KSamplerSelect",
      "inputs": {
        "sampler_name": "euler"
      }
    },
    "459:502": {
      "class_type": "ManualSigmas",
      "inputs": {
        "sigmas": "1.0, 0.978453, 0.95418, 0.926626, 0.89508, 0.845148, 0.704534, 0.414568, 0"
      }
    },
    "459:468": {
      "class_type": "ComfySwitchNode",
      "inputs": {
        "switch": false,
        "on_false": [
          "459:474",
          2
        ],
        "on_true": [
          "459:456",
          0
        ]
      }
    },
    "459:456": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "width": 1024,
        "height": 1024,
        "batch_size": 1
      }
    }
  },
  "pikaH3Fl2va": {
    "92": {
      "class_type": "SaveVideo",
      "inputs": {
        "filename_prefix": "video/Pika_H3_Flex_FL2VA",
        "format": "auto",
        "format.codec": "auto",
        "codec": "auto",
        "video": [
          "140:130",
          0
        ]
      }
    },
    "147": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "148": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "155": {
      "class_type": "easy cleanGpuUsed",
      "inputs": {
        "anything": [
          "92",
          0
        ]
      }
    },
    "140:130": {
      "class_type": "CreateVideo",
      "inputs": {
        "fps": 24,
        "bit_depth": "auto",
        "color_space": "sRGB",
        "chroma_subsampling": "none",
        "codec": "none",
        "images": [
          "140:122",
          0
        ],
        "audio": [
          "140:121",
          0
        ]
      }
    },
    "140:122": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": [
          "140:125",
          0
        ],
        "vae": [
          "140:119",
          0
        ]
      }
    },
    "140:125": {
      "class_type": "SamplerCustomAdvanced",
      "inputs": {
        "noise": [
          "140:129",
          0
        ],
        "guider": [
          "140:126",
          0
        ],
        "sampler": [
          "140:123",
          0
        ],
        "sigmas": [
          "140:143",
          0
        ],
        "latent_image": [
          "140:131",
          1
        ]
      }
    },
    "140:129": {
      "class_type": "RandomNoise",
      "inputs": {
        "noise_seed": 653772413905684
      }
    },
    "140:126": {
      "class_type": "BasicGuider",
      "inputs": {
        "model": [
          "140:134",
          0
        ],
        "conditioning": [
          "140:131",
          0
        ]
      }
    },
    "140:134": {
      "class_type": "LoraLoaderModelOnly",
      "inputs": {
        "lora_name": "pika_h3_flex_fl2va_v1_bf16.safetensors",
        "strength_model": 1,
        "model": [
          "140:127",
          0
        ]
      }
    },
    "140:127": {
      "class_type": "UNETLoader",
      "inputs": {
        "unet_name": "minimax_h3_fl2va_pruned_int8_convrot.safetensors",
        "weight_dtype": "default"
      }
    },
    "140:131": {
      "class_type": "MiniMaxH3ImageToVideo",
      "inputs": {
        "prompt": "",
        "width": [
          "140:150",
          1
        ],
        "height": [
          "140:151",
          1
        ],
        "length": [
          "140:132",
          1
        ],
        "clip": [
          "140:128",
          0
        ],
        "vae": [
          "140:119",
          0
        ],
        "first_frame": [
          "148",
          0
        ],
        "last_frame": [
          "147",
          0
        ]
      }
    },
    "140:150": {
      "class_type": "ComfyMathExpression",
      "inputs": {
        "expression": "round(a/32)*32",
        "values.a": [
          "140:152",
          0
        ]
      }
    },
    "140:152": {
      "class_type": "PrimitiveInt",
      "inputs": {
        "value": 1344
      }
    },
    "140:151": {
      "class_type": "ComfyMathExpression",
      "inputs": {
        "expression": "round(a/32)*32",
        "values.a": [
          "140:153",
          0
        ]
      }
    },
    "140:153": {
      "class_type": "PrimitiveInt",
      "inputs": {
        "value": 768
      }
    },
    "140:132": {
      "class_type": "ComfyMathExpression",
      "inputs": {
        "expression": "max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17",
        "values.a": [
          "140:133",
          0
        ]
      }
    },
    "140:133": {
      "class_type": "PrimitiveFloat",
      "inputs": {
        "value": 5
      }
    },
    "140:128": {
      "class_type": "CLIPLoader",
      "inputs": {
        "clip_name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
        "type": "minimax",
        "device": "default"
      }
    },
    "140:119": {
      "class_type": "VAELoader",
      "inputs": {
        "vae_name": "minimax_h3_video_vae_int8_convrot.safetensors"
      }
    },
    "140:123": {
      "class_type": "KSamplerSelect",
      "inputs": {
        "sampler_name": "lcm"
      }
    },
    "140:143": {
      "class_type": "ManualSigmas",
      "inputs": {
        "sigmas": "1.0, 0.972973, 0.923077, 0.8, 0.571429, 0.333333, 0.0"
      }
    },
    "140:121": {
      "class_type": "VAEDecodeAudio",
      "inputs": {
        "samples": [
          "140:125",
          0
        ],
        "vae": [
          "140:120",
          0
        ]
      }
    },
    "140:120": {
      "class_type": "VAELoader",
      "inputs": {
        "vae_name": "minimax_h3_audio_vae_fp32.safetensors"
      }
    }
  },
  "pikaH3Ref2va": {
    "92": {
      "class_type": "SaveVideo",
      "inputs": {
        "filename_prefix": "video/Pika_H3_Flex_REF2V",
        "format": "auto",
        "format.codec": "auto",
        "codec": "auto",
        "video": [
          "130",
          0
        ]
      }
    },
    "115": {
      "class_type": "ResolutionSelector",
      "inputs": {
        "aspect_ratio": "16:9 (Widescreen)",
        "megapixels": 1,
        "multiple": 32
      }
    },
    "119": {
      "class_type": "VAELoader",
      "inputs": {
        "vae_name": "minimax_h3_video_vae_int8_convrot.safetensors"
      }
    },
    "120": {
      "class_type": "VAELoader",
      "inputs": {
        "vae_name": "minimax_h3_audio_vae_fp32.safetensors"
      }
    },
    "121": {
      "class_type": "VAEDecodeAudio",
      "inputs": {
        "samples": [
          "125",
          0
        ],
        "vae": [
          "120",
          0
        ]
      }
    },
    "122": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": [
          "125",
          0
        ],
        "vae": [
          "119",
          0
        ]
      }
    },
    "123": {
      "class_type": "KSamplerSelect",
      "inputs": {
        "sampler_name": "lcm"
      }
    },
    "125": {
      "class_type": "SamplerCustomAdvanced",
      "inputs": {
        "noise": [
          "129",
          0
        ],
        "guider": [
          "126",
          0
        ],
        "sampler": [
          "123",
          0
        ],
        "sigmas": [
          "147",
          0
        ],
        "latent_image": [
          "136",
          1
        ]
      }
    },
    "126": {
      "class_type": "BasicGuider",
      "inputs": {
        "model": [
          "145",
          0
        ],
        "conditioning": [
          "136",
          0
        ]
      }
    },
    "127": {
      "class_type": "UNETLoader",
      "inputs": {
        "unet_name": "minimax_h3_ref2va_pruned_int8_convrot.safetensors",
        "weight_dtype": "default"
      }
    },
    "128": {
      "class_type": "CLIPLoader",
      "inputs": {
        "clip_name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
        "type": "minimax",
        "device": "default"
      }
    },
    "129": {
      "class_type": "RandomNoise",
      "inputs": {
        "noise_seed": 557871060875590
      }
    },
    "130": {
      "class_type": "CreateVideo",
      "inputs": {
        "fps": 24,
        "bit_depth": 8,
        "color_space": "sRGB",
        "chroma_subsampling": "none",
        "codec": "none",
        "images": [
          "122",
          0
        ],
        "audio": [
          "121",
          0
        ]
      }
    },
    "131": {
      "class_type": "ComfyMathExpression",
      "inputs": {
        "expression": "max(5, round(a * 24)) + (5 - (max(5, round(a * 24)) % 17)) % 17",
        "values.a": [
          "132",
          0
        ]
      }
    },
    "132": {
      "class_type": "PrimitiveFloat",
      "inputs": {
        "value": 5
      }
    },
    "136": {
      "class_type": "MiniMaxH3ReferenceToVideo",
      "inputs": {
        "prompt": "",
        "width": [
          "115",
          0
        ],
        "height": [
          "115",
          1
        ],
        "length": [
          "131",
          1
        ],
        "ref_image_size": "match",
        "clip": [
          "128",
          0
        ],
        "vae": [
          "119",
          0
        ],
        "audio_vae": [
          "120",
          0
        ],
        "ref_images.ref_image_0": [
          "151",
          0
        ],
        "ref_images.ref_image_1": [
          "149",
          0
        ],
        "ref_images.ref_image_2": [
          "150",
          0
        ],
        "ref_images.ref_image_3": [
          "153",
          0
        ],
        "ref_images.ref_image_4": [
          "154",
          0
        ],
        "ref_videos.ref_video_0": [
          "165",
          0
        ],
        "ref_audios.ref_audio_0": [
          "159",
          0
        ],
        "ref_audios.ref_audio_1": [
          "160",
          0
        ],
        "ref_audios.ref_audio_2": [
          "161",
          0
        ],
        "ref_images.ref_image_5": [
          "155",
          0
        ],
        "ref_images.ref_image_6": [
          "156",
          0
        ],
        "ref_images.ref_image_7": [
          "157",
          0
        ],
        "ref_images.ref_image_8": [
          "158",
          0
        ]
      }
    },
    "145": {
      "class_type": "LoraLoaderModelOnly",
      "inputs": {
        "lora_name": "pika_h3_flex_ref2va_v1_bf16.safetensors",
        "strength_model": 1,
        "model": [
          "127",
          0
        ]
      }
    },
    "147": {
      "class_type": "ManualSigmas",
      "inputs": {
        "sigmas": "1.0, 0.972973, 0.923077, 0.8, 0.571429, 0.333333, 0.0"
      }
    },
    "149": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "150": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "151": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "153": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "154": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "155": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "156": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "157": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "158": {
      "class_type": "LoadImage",
      "inputs": {
        "image": ""
      }
    },
    "159": {
      "class_type": "LoadAudio",
      "inputs": {
        "audio": ""
      }
    },
    "160": {
      "class_type": "LoadAudio",
      "inputs": {
        "audio": ""
      }
    },
    "161": {
      "class_type": "LoadAudio",
      "inputs": {
        "audio": ""
      }
    },
    "165": {
      "class_type": "XHLoadVideo",
      "inputs": {
        "video": "",
        "force_rate": 24,
        "custom_width": 0,
        "custom_height": 0,
        "start_sec": 0,
        "duration": 0,
        "start_frame": 0,
        "frame_count": 0,
        "frame_load_cap": 124,
        "skip_first_frames": 0,
        "select_every_nth": 1
      }
    },
    "169": {
      "class_type": "easy cleanGpuUsed",
      "inputs": {
        "anything": [
          "92",
          0
        ]
      }
    }
  },
  "realEsrganX2": {
    "1": {
      "class_type": "UpscaleModelLoader",
      "inputs": {
        "model_name": "RealESRGAN_x2plus.pth"
      }
    },
    "2": {
      "class_type": "ImageUpscaleWithModel",
      "inputs": {
        "upscale_model": [
          "1",
          0
        ],
        "image": [
          "10",
          0
        ]
      }
    },
    "9": {
      "class_type": "LoadVideo",
      "inputs": {
        "file": "",
        "video-preview": ""
      }
    },
    "10": {
      "class_type": "GetVideoComponents",
      "inputs": {
        "video": [
          "9",
          0
        ]
      }
    },
    "11": {
      "class_type": "CreateVideo",
      "inputs": {
        "fps": [
          "10",
          2
        ],
        "bit_depth": "auto",
        "color_space": "sRGB",
        "chroma_subsampling": "none",
        "codec": "none",
        "images": [
          "2",
          0
        ],
        "audio": [
          "10",
          1
        ]
      }
    },
    "12": {
      "class_type": "SaveVideo",
      "inputs": {
        "filename_prefix": "video/0.5M放大2倍RealESRGAN",
        "format": "auto",
        "format.codec": "auto",
        "codec": "auto",
        "video": [
          "11",
          0
        ]
      }
    },
    "13": {
      "class_type": "easy cleanGpuUsed",
      "inputs": {
        "anything": [
          "12",
          0
        ]
      }
    }
  }
};

function connection(context: ProviderContext) {
  const url = new URL(String(context.config.baseUrl || "http://127.0.0.1:8188").replace(/\/+$/, ""));
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("ComfyUI 地址须为不含凭据、查询参数或片段的 HTTP 地址");
  return url.href.replace(/\/$/, "");
}

function headers(context: ProviderContext): Record<string, string> {
  const token = String(context.config.token || "").trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function json(context: ProviderContext, path: string, signal: AbortSignal, body?: unknown) {
  const response = await context.tool.fetch(`${connection(context)}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...headers(context), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body), signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`ComfyUI HTTP ${response.status}：${context.tool.errorMessage(data) || "请求失败"}`);
  return data;
}

async function upload(context: ProviderContext, input: MediaInput, signal: AbortSignal) {
  let bytes: Uint8Array;
  let mime = input.mimeType || "application/octet-stream";
  if (input.type === "url") {
    const response = await context.tool.fetch(input.url, { signal });
    if (!response.ok) throw new Error(`读取参考素材失败：HTTP ${response.status}`);
    bytes = await readBytes(response, signal);
    mime = response.headers.get("content-type")?.split(";")[0] || mime;
  } else if (input.type === "binary") bytes = input.data;
  else {
    const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(input.data);
    mime = match?.[1] || mime;
    bytes = Buffer.from(match?.[2] || input.data, "base64");
  }
  if (!bytes.length || bytes.length > 100 * 1024 * 1024) throw new Error("参考素材为空或超过 100 MB");
  const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "audio/wav": "wav", "audio/x-wav": "wav", "audio/mpeg": "mp3", "audio/flac": "flac", "audio/ogg": "ogg" };
  const extension = extensions[mime];
  if (!extension) throw new Error(`ComfyUI 不支持此参考素材格式：${mime}`);
  const name = `toonflow${Date.now()}${Math.random().toString(16).slice(2)}.${extension}`;
  // VM 不提供 FormData，直接构造标准 multipart；不依赖 Node 模块。
  const boundary = `toonflow${Math.random().toString(16).slice(2)}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${name}"\r\nContent-Type: ${mime}\r\n\r\n`),
    bytes, Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const response = await context.tool.fetch(`${connection(context)}/upload/image`, {
    method: "POST", headers: { ...headers(context), "Content-Type": `multipart/form-data; boundary=${boundary}` }, body, signal,
  });
  const result = await response.json() as { name?: string; subfolder?: string };
  if (!response.ok || !result.name) throw new Error(`上传 ComfyUI 素材失败：${context.tool.errorMessage(result) || response.status}`);
  return result.subfolder ? `${result.subfolder}/${result.name}` : result.name;
}

async function readBytes(response: Response, signal: AbortSignal) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("ComfyUI 返回空媒体");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 100 * 1024 * 1024) throw new Error("媒体文件超过 100 MB");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  if (!size) throw new Error("ComfyUI 返回空媒体");
  return Buffer.concat(chunks, size);
}

function deadline(context: ProviderContext) {
  const minutes = Number(context.config.timeoutMinutes ?? 120);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) throw new Error("ComfyUI 超时须在 1 到 1440 分钟之间");
  const timeout = AbortSignal.timeout(minutes * 60000);
  return context.signal ? AbortSignal.any([context.signal, timeout]) : timeout;
}

function wait(signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 2000);
    signal.addEventListener("abort", abort, { once: true });
  });
}

async function poll(context: ProviderContext, task: ComfyTask, signal: AbortSignal): Promise<MediaAsset[]> {
  if (task.server !== connection(context)) throw new Error("ComfyUI 地址已改变，请恢复原地址后查询任务");
  while (true) {
    const history = await json(context, `/history/${encodeURIComponent(task.promptId)}`, signal) as Record<string, {
      status?: { status_str?: string; completed?: boolean; messages?: unknown[] };
      outputs?: Record<string, Record<string, { filename?: string; subfolder?: string; type?: string }[]>>;
    }>;
    const entry = history[task.promptId];
    if (entry?.status?.status_str === "error") throw Object.assign(new Error(`ComfyUI 执行失败：${context.tool.errorMessage(entry.status.messages) || "请查看 ComfyUI 日志"}`), { code: "MEDIA_TASK_FAILED" });
    if (entry?.status?.completed) {
      const output = entry.outputs?.[task.outputNode];
      const files = output ? Object.values(output).filter(Array.isArray).flat().filter(file => file && typeof file.filename === "string") : [];
      if (!files.length) throw Object.assign(new Error("ComfyUI 已完成但保存节点未返回媒体文件"), { code: "MEDIA_TASK_FAILED" });
      const assets: MediaAsset[] = [];
      for (const file of files) {
        const query = new URLSearchParams({ filename: file.filename!, subfolder: file.subfolder || "", type: file.type || "output" });
        const response = await context.tool.fetch(`${connection(context)}/view?${query}`, { headers: headers(context), signal });
        if (!response.ok) throw new Error(`下载 ComfyUI 结果失败：HTTP ${response.status}`);
        assets.push({ type: "binary", mediaType: task.mediaType, data: await readBytes(response, signal), mimeType: response.headers.get("content-type") || (task.mediaType === "image" ? "image/png" : "video/mp4") });
      }
      return assets;
    }
    await wait(signal);
  }
}

function dimensions(ratio = "1:1", size = "1K", multiple = 8) {
  const match = /^([1-9]\d{0,3}):([1-9]\d{0,3})$/.exec(ratio);
  const pixels: Record<string, number> = { "1K": 1024 ** 2, "2K": 2048 ** 2, "0.5MP": 500000, "1MP": 1000000 };
  if (!match || !pixels[size]) throw new Error("ComfyUI 比例或分辨率无效");
  const aspect = Number(match[1]) / Number(match[2]);
  const width = Math.max(multiple, Math.round(Math.sqrt(pixels[size] * aspect) / multiple) * multiple);
  const height = Math.max(multiple, Math.round(Math.sqrt(pixels[size] / aspect) / multiple) * multiple);
  if (width > 8192 || height > 8192) throw new Error("ComfyUI 输出边长不能超过 8192");
  return { width, height };
}

function videoPrompt(request: ReferencedVideoRequest) {
  return request.prompt.replace(/\{\{ref (\d+)\}\}/g, (marker, number: string) => {
    const reference = request.referenceOrder?.[Number(number) - 1];
    if (!reference) throw new Error(`引用标记 ${marker} 缺少素材映射`);
    if (reference.type === "text") return `参考 ${number}`;
    if (reference.type === "firstFrame" || reference.type === "lastFrame") {
      if (!request[reference.type]) throw new Error(`引用标记 ${marker} 对应帧不存在`);
      return reference.type === "firstFrame" ? "首帧" : "尾帧";
    }
    if (!("index" in reference)) throw new Error("引用类型无效");
    const sources = { image: request.images, video: request.videos, audio: request.audios };
    if (!sources[reference.type]?.[reference.index]) throw new Error(`引用标记 ${marker} 对应素材不存在`);
    return `<${{ image: "Picture", video: "Video", audio: "Audio" }[reference.type]} ${reference.index + 1}>`;
  });
}

async function submit(context: ProviderContext, workflow: Workflow, outputNode: string, mediaType: "image" | "video", signal: AbortSignal) {
  // 保留保存结果及末尾清理节点的依赖，去掉未使用的示例素材与界面辅助节点。
  const prompt: Workflow = {};
  function visit(id: string) {
    if (prompt[id]) return;
    const node = workflow[id];
    if (!node) throw new Error(`工作流缺少节点 ${id}`);
    prompt[id] = node;
    for (const value of Object.values(node.inputs)) if (Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && typeof value[1] === "number") visit(value[0]);
  }
  visit(outputNode);
  for (const [id, node] of Object.entries(workflow)) {
    if (node.class_type === "easy cleanGpuUsed") visit(id);
  }
  const data = await json(context, "/prompt", signal, { prompt }) as { prompt_id?: string };
  if (!data.prompt_id) throw new Error(`ComfyUI 未返回任务 ID：${context.tool.errorMessage(data)}`);
  const task: ComfyTask = { promptId: data.prompt_id, mediaType, outputNode, server: connection(context) };
  await context.saveTaskData?.(task);
  return poll(context, task, signal);
}

export default {
  id: "comfyui",
  label: "ComfyUI 本地工作流",
  icon: "",
  version: "1.0.1",
  readme: "连接运行中的 ComfyUI，默认 http://127.0.0.1:8188。须安装原工作流所需模型与自定义节点（含 ComfyUI-Easy-Use 的 easy cleanGpuUsed）。每个工作流在保存结果后执行清理节点。支持 Qwen 文生图/最多10张参考图编辑、Pika 首尾帧/多参考视频、RealESRGAN 视频二倍放大（引用一个视频，保留音轨和帧率）。提示词直接传入模型。图片编辑默认沿用首张参考图尺寸，选择比例/尺寸时使用指定尺寸。Pika 按24fps对齐帧数，实际时长可能略有差异。取消仅停止 Toonflow 等待，不中断 ComfyUI 中其他任务；恢复依赖 ComfyUI 保留原任务历史。可选令牌用于反向代理 Bearer 鉴权。",
  rules: [
    { type: "input", field: "baseUrl", title: "ComfyUI 地址", value: "http://127.0.0.1:8188" },
    { type: "input", field: "token", title: "访问令牌（可选）", value: "", props: { type: "password", showPassword: true } },
    { type: "inputNumber", field: "timeoutMinutes", title: "等待超时（分钟）", value: 120, props: { min: 1, max: 1440 } },
  ],
  models: [
    { id: "qwenImage21T2i", label: "Qwen Image 2.1 Turbo 文生图", type: "image", mode: ["text"], imageSizes: ["1K", "2K"], imageRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"] },
    { id: "qwenImage21Edit", label: "Qwen Image 2.1 Turbo 图片编辑", type: "image", mode: ["singleImage", "multiReference"], imageSizes: ["1K", "2K"], imageRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"] },
    { id: "pikaH3Fl2va", label: "Pika H3 Flex 首尾帧视频", type: "video", mode: ["endFrameOptional", "startFrameOptional"], audio: "optional", durationResolutionMap: [{ duration: [5, 10, 15], resolution: ["0.5MP", "1MP"] }] },
    { id: "pikaH3Ref2va", label: "Pika H3 Flex 多参考视频", type: "video", mode: ["text", ["imageReference:9", "videoReference:3", "audioReference:3"]], audio: "optional", durationResolutionMap: [{ duration: [5, 10, 15], resolution: ["0.5MP", "1MP"] }] },
    { id: "realEsrganX2", label: "RealESRGAN 视频二倍放大", type: "video", mode: [["videoReference:1"]], audio: true },
  ],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    if (!["qwenImage21T2i", "qwenImage21Edit"].includes(request.model)) throw new Error("ComfyUI 图片模型无效");
    const images = request.images || [];
    const edit = request.model === "qwenImage21Edit";
    if (edit ? !images.length || images.length > 10 : images.length > 0) throw new Error(edit ? "Qwen 图片编辑需要 1 到 10 张参考图" : "Qwen 文生图不接受参考图，请选择图片编辑模型");
    const signal = deadline(this);
    const workflow = JSON.parse(JSON.stringify(workflows[request.model])) as Workflow;
    const encoder = workflow[edit ? "459:474" : "459:452"].inputs;
    encoder.prompt = request.prompt;
    const { width, height } = dimensions(request.ratio, request.size);
    Object.assign(workflow["459:456"].inputs, { width, height, batch_size: 1 });
    if (edit) {
      for (const key of Object.keys(encoder)) if (key.startsWith("images.")) delete encoder[key];
      for (const [index, image] of images.entries()) {
        const id = `inputImage${index}`;
        workflow[id] = { class_type: "LoadImage", inputs: { image: await upload(this, image, signal) } };
        encoder[`images.image_${index + 1}`] = [id, 0];
      }
      workflow["459:468"].inputs.switch = !!(request.ratio || request.size);
    }
    for (const node of Object.values(workflow)) if (node.class_type === "RandomNoise") node.inputs.noise_seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    return submit(this, workflow, "461", "image", signal);
  },
  async generateVideo(request: ReferencedVideoRequest): Promise<MediaAsset[]> {
    if (!["pikaH3Fl2va", "pikaH3Ref2va", "realEsrganX2"].includes(request.model)) throw new Error("ComfyUI 视频模型无效");
    const frames = request.model === "pikaH3Fl2va";
    const upscale = request.model === "realEsrganX2";
    if (upscale && (request.videos?.length !== 1 || request.images?.length || request.audios?.length || request.firstFrame || request.lastFrame)) throw new Error("RealESRGAN 视频放大只接受一个参考视频");
    if (frames && (request.images?.length || request.videos?.length || request.audios?.length)) throw new Error("首尾帧模型请通过首帧、尾帧传入图片");
    if (!frames && !upscale && (request.firstFrame || request.lastFrame || (request.images?.length || 0) > 9 || (request.videos?.length || 0) > 3 || (request.audios?.length || 0) > 3)) throw new Error("多参考模型最多接受9张图片、3个视频和3段音频，请使用参考模式");
    if (!upscale && request.duration !== undefined && ![5, 10, 15].includes(request.duration)) throw new Error("Pika 视频时长支持 5、10、15 秒");
    const signal = deadline(this);
    const workflow = JSON.parse(JSON.stringify(workflows[request.model])) as Workflow;
    if (upscale) workflow["9"].inputs.file = await upload(this, request.videos![0], signal);
    else {
      const encoder = workflow[frames ? "140:131" : "136"].inputs;
      encoder.prompt = videoPrompt(request);
      Object.assign(encoder, dimensions(request.ratio || "16:9", request.resolution || "1MP", 32));
      workflow[frames ? "140:133" : "132"].inputs.value = request.duration || 5;
      if (request.generateAudio === false) delete workflow[frames ? "140:130" : "130"].inputs.audio;
      if (frames) {
        delete encoder.first_frame;
        delete encoder.last_frame;
        for (const field of ["firstFrame", "lastFrame"] as const) {
          if (!request[field]) continue;
          const id = field === "firstFrame" ? "148" : "147";
          workflow[id].inputs.image = await upload(this, request[field], signal);
          encoder[field === "firstFrame" ? "first_frame" : "last_frame"] = [id, 0];
        }
      } else {
        for (const key of Object.keys(encoder)) if (/^ref_(images|videos|audios|video_audios)\./.test(key)) delete encoder[key];
        for (const [kind, items] of [["image", request.images], ["video", request.videos], ["audio", request.audios]] as const) {
          for (const [index, input] of (items || []).entries()) {
            const id = `input${kind}${index}`;
            const file = await upload(this, input, signal);
            workflow[id] = kind === "video" ? { class_type: "XHLoadVideo", inputs: { ...workflow["165"].inputs, video: file, frame_load_cap: 362 } }
              : { class_type: kind === "image" ? "LoadImage" : "LoadAudio", inputs: { [kind]: file } };
            encoder[`ref_${kind}s.ref_${kind}_${index}`] = [id, 0];
          }
        }
      }
      for (const node of Object.values(workflow)) if (node.class_type === "RandomNoise") node.inputs.noise_seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    }
    return submit(this, workflow, upscale ? "12" : "92", "video", signal);
  },
  async resumeTask(data: ProviderTaskData): Promise<MediaAsset[]> {
    if (typeof data.promptId !== "string" || !data.promptId || !["image", "video"].includes(String(data.mediaType))
      || !["461", "92", "12"].includes(String(data.outputNode)) || typeof data.server !== "string") throw new Error("ComfyUI 恢复凭据无效");
    return poll(this, data as ComfyTask, deadline(this));
  },
} satisfies ProviderDefinition;
