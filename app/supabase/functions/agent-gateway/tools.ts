/**
 * Agent Gateway 工具定义
 *
 * 定义 Agent 可调用的工具，遵循 OpenAI Function Calling 格式
 * 参考: docs/epic-23-a2ui/tools.md
 */

import type { ChatCompletionTool } from 'npm:openai@4'

export const TOOLS: ChatCompletionTool[] = [
  // ============ 核心工具 ============
  {
    type: 'function',
    function: {
      name: 'renderUI',
      description:
        '生成 A2UI 界面供用户交互。当需要用户选择、确认、预览时调用。',
      parameters: {
        type: 'object',
        properties: {
          surfaceId: {
            type: 'string',
            description: '界面唯一标识，如不提供将自动生成',
          },
          component: {
            type: 'object',
            description: 'A2UI 组件树',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              props: { type: 'object' },
              actions: { type: 'object' },
              children: { type: 'array' },
            },
            required: ['id', 'type'],
          },
          dataModel: {
            type: 'object',
            description: '数据模型，用于绑定组件属性',
          },
        },
        required: ['component'],
      },
    },
  },

  // ============ 编辑工具 ============
  {
    type: 'function',
    function: {
      name: 'cropPhoto',
      description: '裁剪照片到指定比例',
      parameters: {
        type: 'object',
        properties: {
          photoId: {
            type: 'string',
            description: '照片ID',
          },
          aspectRatio: {
            type: 'string',
            enum: ['1:1', '4:3', '16:9', '9:16', 'free'],
            description: '裁剪比例',
          },
        },
        required: ['photoId', 'aspectRatio'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rotatePhoto',
      description: '旋转照片',
      parameters: {
        type: 'object',
        properties: {
          photoId: {
            type: 'string',
            description: '照片ID',
          },
          degrees: {
            type: 'number',
            enum: [90, 180, 270],
            description: '旋转角度（顺时针）',
          },
        },
        required: ['photoId', 'degrees'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'applyFilter',
      description: '应用滤镜效果。grayscale=黑白/灰度，sepia=复古棕褐色，warm=暖色，cool=冷色，vintage=复古',
      parameters: {
        type: 'object',
        properties: {
          photoId: {
            type: 'string',
            description: '照片ID。不提供时自动使用当前编辑的照片或选中的第一张',
          },
          filter: {
            type: 'string',
            enum: [
              'original',
              'grayscale',
              'sepia',
              'invert',
              'high-contrast',
              'warm',
              'cool',
              'vibrant',
              'vintage',
              'film',
              'dramatic',
              'fade',
            ],
            description: '滤镜类型。grayscale=黑白/灰度，sepia=复古棕褐色，invert=反色，warm=暖色调，cool=冷色调，vintage=复古，film=胶片风格，dramatic=戏剧效果',
          },
        },
        required: ['filter'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'adjustImage',
      description: '调整图片参数（亮度、对比度、饱和度等）',
      parameters: {
        type: 'object',
        properties: {
          photoId: {
            type: 'string',
            description: '照片ID',
          },
          adjustments: {
            type: 'object',
            properties: {
              brightness: {
                type: 'number',
                minimum: -100,
                maximum: 100,
                description: '亮度调整 (-100 到 100)',
              },
              contrast: {
                type: 'number',
                minimum: -100,
                maximum: 100,
                description: '对比度调整 (-100 到 100)',
              },
              saturation: {
                type: 'number',
                minimum: -100,
                maximum: 100,
                description: '饱和度调整 (-100 到 100)',
              },
            },
          },
        },
        required: ['photoId', 'adjustments'],
      },
    },
  },

  // ============ AI 工具 ============
  {
    type: 'function',
    function: {
      name: 'optimizeForAI',
      description: '根据目标 AI 服务优化图片尺寸和格式',
      parameters: {
        type: 'object',
        properties: {
          photoId: {
            type: 'string',
            description: '照片ID',
          },
          targetService: {
            type: 'string',
            enum: ['i2v-single', 'i2v-keyframe', 'emo', 'fusion'],
            description: '目标服务类型',
          },
        },
        required: ['photoId', 'targetService'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generateVideo',
      description: '从照片生成 AI 视频',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['i2v', 'kf2v', 'emo'],
            description: '视频生成类型：i2v (单图)、kf2v (首尾帧)、emo (说话人)',
          },
          photoIds: {
            type: 'array',
            items: { type: 'string' },
            description: '照片ID列表',
          },
          duration: {
            type: 'number',
            enum: [5, 10],
            description: '视频时长（秒）',
          },
          prompt: {
            type: 'string',
            description: '视频生成提示词（可选）',
          },
        },
        required: ['type', 'photoIds', 'duration'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fusePhotos',
      description: '使用 AI 融合多张照片生成新图像',
      parameters: {
        type: 'object',
        properties: {
          photoIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 10,
            description: '要融合的照片ID（2-10张）',
          },
          prompt: {
            type: 'string',
            minLength: 10,
            description: '融合提示词，描述期望的结果',
          },
        },
        required: ['photoIds', 'prompt'],
      },
    },
  },

  // ============ 上下文工具 ============
  {
    type: 'function',
    function: {
      name: 'getSelectedPhotos',
      description:
        '【必须优先调用】获取当前用户选中的照片列表。在执行任何需要照片的操作（编辑、旋转、裁剪、滤镜、融合、视频等）之前，必须先调用此工具确认选中状态。如果没有选中照片，工具会自动返回 selection-guide 引导界面。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCurrentPhoto',
      description: '获取当前正在编辑的照片信息',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'loadPhotoForEdit',
      description:
        '加载照片到编辑状态。不提供 photoId 时自动加载第一张选中的照片。',
      parameters: {
        type: 'object',
        properties: {
          photoId: {
            type: 'string',
            description: '照片ID。不提供时自动加载第一张选中的照片',
          },
          navigateToEditor: {
            type: 'boolean',
            description: '是否同时导航到编辑器页面（默认 false）',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigateToPage',
      description:
        '导航到指定页面。当需要引导用户到特定页面时使用。',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['timeline', 'editor', 'album', 'ai-studio', 'search'],
            description: '目标页面',
          },
          params: {
            type: 'object',
            properties: {
              photoId: {
                type: 'string',
                description: '照片ID（导航到 editor 时必需）',
              },
              albumId: {
                type: 'string',
                description: '相册ID（导航到 album 时可选）',
              },
            },
          },
        },
        required: ['page'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'saveEditedAsNew',
      description: '将编辑后的照片另存为新照片（不覆盖原图）',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
]

/**
 * 获取工具名称到描述的映射
 */
export function getToolDescriptions(): Record<string, string> {
  return TOOLS.reduce(
    (acc, tool) => {
      acc[tool.function.name] = tool.function.description || ''
      return acc
    },
    {} as Record<string, string>
  )
}