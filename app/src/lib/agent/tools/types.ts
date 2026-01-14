import type { z } from 'zod';
import type { A2UIComponent } from '@/types/a2ui';

export type ToolCategory = 'edit' | 'ai' | 'context' | 'navigation';

export interface ToolExecutionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
  ui?: A2UIComponent;
}

export interface ToolDefinitionConfig<T extends z.ZodObject<z.ZodRawShape>> {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: T;
  execute: (params: z.infer<T>) => Promise<ToolExecutionResult>;
}

export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface RegisteredTool<T extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>> {
  definition: OpenAIToolDefinition;
  execute: (params: z.infer<T>) => Promise<ToolExecutionResult>;
  validateAndExecute: (args: unknown) => Promise<ToolExecutionResult>;
  schema: T;
  meta: {
    name: string;
    description: string;
    category: ToolCategory;
  };
}
