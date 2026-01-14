import { z } from 'zod';
import { defineTool } from '../registry';

const myToolParamsSchema = z.object({
  param1: z.string().describe('参数1说明'),
  param2: z.number().optional().describe('可选参数2'),
});

export const myTool = defineTool({
  name: 'myToolName',
  description: '工具描述',
  category: 'edit',
  parameters: myToolParamsSchema,

  async execute(params) {
    return {
      success: true,
      message: `操作成功: ${params.param1}`,
      data: { result: params.param2 ?? 0 },
      ui: {
        id: `my-ui-${Date.now()}`,
        type: 'photo-preview',
        props: {},
      },
    };
  },
});
