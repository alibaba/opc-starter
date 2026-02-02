import { z } from 'zod'
import zodToJsonSchema from 'zod-to-json-schema'
import type {
  ToolDefinitionConfig,
  RegisteredTool,
  OpenAIToolDefinition,
  ToolExecutionResult,
} from './types'

const toolRegistry = new Map<string, RegisteredTool>()

export function defineTool<T extends z.ZodObject<z.ZodRawShape>>(
  config: ToolDefinitionConfig<T>
): RegisteredTool<T> {
  const { name, description, category, parameters, execute } = config

  // 使用类型断言解决 zod v4 与 zod-to-json-schema 的类型兼容问题
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = zodToJsonSchema(parameters as any, { target: 'openAi' })

  const definition: OpenAIToolDefinition = {
    type: 'function',
    function: {
      name,
      description,
      parameters: jsonSchema as Record<string, unknown>,
    },
  }

  const validateAndExecute = async (args: unknown): Promise<ToolExecutionResult> => {
    const parseResult = parameters.safeParse(args)
    if (!parseResult.success) {
      return {
        success: false,
        error: `参数验证失败: ${parseResult.error.message}`,
      }
    }
    return execute(parseResult.data)
  }

  const tool: RegisteredTool<T> = {
    definition,
    execute,
    validateAndExecute,
    schema: parameters,
    meta: { name, description, category },
  }

  toolRegistry.set(name, tool as RegisteredTool)

  return tool
}

export function getTool(name: string): RegisteredTool | undefined {
  return toolRegistry.get(name)
}

export function getAllToolDefinitions(): OpenAIToolDefinition[] {
  return Array.from(toolRegistry.values()).map((t) => t.definition)
}

export function getAllTools(): RegisteredTool[] {
  return Array.from(toolRegistry.values())
}

export async function executeToolByName(name: string, args: unknown): Promise<ToolExecutionResult> {
  console.log(`[ToolRegistry] executeToolByName: ${name}`, JSON.stringify(args))

  const tool = getTool(name)
  if (!tool) {
    return { success: false, error: `未知工具: ${name}` }
  }
  return tool.validateAndExecute(args)
}

export function clearRegistry(): void {
  toolRegistry.clear()
}
