import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  defineTool,
  getTool,
  getAllToolDefinitions,
  executeToolByName,
  clearRegistry,
} from './registry';

describe('defineTool', () => {
  beforeEach(() => {
    clearRegistry();
  });

  const createTestTool = () =>
    defineTool({
      name: 'testTool',
      description: 'A test tool',
      category: 'edit',
      parameters: z.object({
        value: z.string(),
        count: z.number().optional(),
      }),
      async execute(params) {
        return { success: true, message: `Got: ${params.value}` };
      },
    });

  it('should generate OpenAI tool definition', () => {
    const tool = createTestTool();
    expect(tool.definition.type).toBe('function');
    expect(tool.definition.function.name).toBe('testTool');
    expect(tool.definition.function.description).toBe('A test tool');
    expect(tool.definition.function.parameters).toBeDefined();
  });

  it('should register tool in registry', () => {
    createTestTool();
    const retrieved = getTool('testTool');
    expect(retrieved).toBeDefined();
    expect(retrieved?.meta.name).toBe('testTool');
  });

  it('should return all tool definitions', () => {
    createTestTool();
    defineTool({
      name: 'anotherTool',
      description: 'Another tool',
      category: 'ai',
      parameters: z.object({ id: z.string() }),
      async execute() {
        return { success: true };
      },
    });

    const definitions = getAllToolDefinitions();
    expect(definitions).toHaveLength(2);
    expect(definitions.map((d) => d.function.name)).toContain('testTool');
    expect(definitions.map((d) => d.function.name)).toContain('anotherTool');
  });

  it('should validate params before execution', async () => {
    const tool = createTestTool();
    const result = await tool.validateAndExecute({ value: 123 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('参数验证失败');
  });

  it('should execute with valid params', async () => {
    const tool = createTestTool();
    const result = await tool.validateAndExecute({ value: 'hello' });
    expect(result.success).toBe(true);
    expect(result.message).toBe('Got: hello');
  });

  it('should execute with optional params', async () => {
    const tool = createTestTool();
    const result = await tool.validateAndExecute({ value: 'test', count: 5 });
    expect(result.success).toBe(true);
  });
});

describe('executeToolByName', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('should execute registered tool', async () => {
    defineTool({
      name: 'myTool',
      description: 'My tool',
      category: 'context',
      parameters: z.object({ input: z.string() }),
      async execute(params) {
        return { success: true, data: { output: params.input.toUpperCase() } };
      },
    });

    const result = await executeToolByName('myTool', { input: 'test' });
    expect(result.success).toBe(true);
    expect(result.data?.output).toBe('TEST');
  });

  it('should return error for unknown tool', async () => {
    const result = await executeToolByName('unknownTool', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('未知工具');
  });

  it('should validate params for executeToolByName', async () => {
    defineTool({
      name: 'validatedTool',
      description: 'Tool with validation',
      category: 'edit',
      parameters: z.object({ required: z.string() }),
      async execute() {
        return { success: true };
      },
    });

    const result = await executeToolByName('validatedTool', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('参数验证失败');
  });
});
