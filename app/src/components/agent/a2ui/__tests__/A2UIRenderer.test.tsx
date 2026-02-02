/**
 * A2UI Renderer 单元测试
 * @description 测试 A2UI 组件渲染、数据绑定、事件处理
 * @version 1.0.0
 * @see STORY-23-011
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { A2UIRenderer, A2UIRendererSafe } from '../A2UIRenderer';
import type { A2UIComponent, A2UIDataModel } from '@/types/a2ui';

// ============ 测试辅助函数 ============

const mockOnAction = vi.fn();

beforeEach(() => {
  mockOnAction.mockClear();
});

// ============ 基础渲染测试 ============

describe('A2UIRenderer - 基础渲染', () => {
  it('渲染 text 组件', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'test-text',
      props: { content: 'Hello World' },
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('渲染 button 组件', () => {
    // Button 需要通过子组件渲染文本
    const component: A2UIComponent = {
      type: 'button',
      id: 'test-button',
      children: [
        { type: 'text', id: 'btn-text', props: { content: '点击我' } },
      ],
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('点击我')).toBeInTheDocument();
  });

  it('渲染 card 组件及其子组件', () => {
    const component: A2UIComponent = {
      type: 'card',
      id: 'test-card',
      children: [
        {
          type: 'card-header',
          id: 'card-header',
          children: [
            {
              type: 'card-title',
              id: 'card-title',
              children: [
                { type: 'text', id: 'title-text', props: { content: '卡片标题' } },
              ],
            },
          ],
        },
        {
          type: 'card-content',
          id: 'card-content',
          children: [
            {
              type: 'text',
              id: 'card-text',
              props: { content: '卡片内容' },
            },
          ],
        },
      ],
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('卡片标题')).toBeInTheDocument();
    expect(screen.getByText('卡片内容')).toBeInTheDocument();
  });

  it('渲染 container 组件', () => {
    const component: A2UIComponent = {
      type: 'container',
      id: 'test-container',
      props: { className: 'test-class' },
      children: [
        { type: 'text', id: 'child-1', props: { content: '子元素1' } },
        { type: 'text', id: 'child-2', props: { content: '子元素2' } },
      ],
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('子元素1')).toBeInTheDocument();
    expect(screen.getByText('子元素2')).toBeInTheDocument();
  });
});

// ============ 数据绑定测试 ============

describe('A2UIRenderer - 数据绑定', () => {
  it('解析简单路径的数据绑定', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'bound-text',
      props: { content: { binding: 'user.name' } },
    };

    const dataModel: A2UIDataModel = {
      user: { name: 'Alice' },
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={dataModel}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('解析嵌套路径的数据绑定', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'nested-bound',
      props: { content: { binding: 'photos.0.metadata.location' } },
    };

    const dataModel: A2UIDataModel = {
      photos: [
        { id: '1', metadata: { location: '北京' } },
        { id: '2', metadata: { location: '上海' } },
      ],
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={dataModel}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('北京')).toBeInTheDocument();
  });

  it('处理不存在的绑定路径', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'missing-binding',
      props: { content: { binding: 'nonexistent.path' } },
    };

    const dataModel: A2UIDataModel = {
      user: { name: 'Bob' },
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={dataModel}
        onAction={mockOnAction}
      />
    );

    // 应该渲染为空或 undefined
    const textElement = screen.queryByText('Bob');
    expect(textElement).not.toBeInTheDocument();
  });

  it('混合静态值和绑定值', () => {
    const component: A2UIComponent = {
      type: 'container',
      id: 'mixed-container',
      props: { className: 'custom-class' },
      children: [
        {
          type: 'text',
          id: 'bound-text',
          props: { content: { binding: 'buttonText' } },
        },
      ],
    };

    const dataModel: A2UIDataModel = {
      buttonText: '动态文本',
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={dataModel}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('动态文本')).toBeInTheDocument();
  });
});

// ============ 事件处理测试 ============

describe('A2UIRenderer - 事件处理', () => {
  it('触发 click 事件回调', () => {
    const component: A2UIComponent = {
      type: 'button',
      id: 'action-button',
      actions: { click: 'button.clicked' },
      children: [
        { type: 'text', id: 'btn-text', props: { content: '操作按钮' } },
      ],
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockOnAction).toHaveBeenCalledWith('action-button', 'button.clicked', expect.anything());
  });

  it('多个事件处理器', () => {
    const component: A2UIComponent = {
      type: 'input',
      id: 'input-field',
      props: { placeholder: '输入...' },
      actions: {
        change: 'input.changed',
        focus: 'input.focused',
      },
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
      />
    );

    const input = screen.getByPlaceholderText('输入...');
    
    fireEvent.focus(input);
    expect(mockOnAction).toHaveBeenCalledWith('input-field', 'input.focused', expect.anything());

    fireEvent.change(input, { target: { value: 'test' } });
    expect(mockOnAction).toHaveBeenCalledTimes(2);
  });

  it('子组件的事件正确传递', () => {
    const component: A2UIComponent = {
      type: 'card',
      id: 'parent-card',
      children: [
        {
          type: 'button',
          id: 'child-button',
          actions: { click: 'child.action' },
          children: [
            { type: 'text', id: 'child-btn-text', props: { content: '子按钮' } },
          ],
        },
      ],
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockOnAction).toHaveBeenCalledWith('child-button', 'child.action', expect.anything());
  });
});

// ============ 未知组件处理测试 ============

describe('A2UIRenderer - 未知组件处理', () => {
  it('渲染未知组件类型的警告', () => {
    const component: A2UIComponent = {
      type: 'unknown-type',
      id: 'unknown-component',
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText(/未知组件类型/)).toBeInTheDocument();
    expect(screen.getByText('unknown-type')).toBeInTheDocument();
  });

  it('显示未知组件的 ID', () => {
    const component: A2UIComponent = {
      type: 'invalid-component',
      id: 'test-id-123',
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText(/test-id-123/)).toBeInTheDocument();
  });
});

// ============ 严格模式测试 ============

describe('A2UIRenderer - 严格模式', () => {
  it('严格模式下正常组件正常渲染', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'normal-text',
      props: { content: 'Normal text' },
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
        strictMode={true}
      />
    );

    // 正常组件应该能渲染
    expect(screen.getByText('Normal text')).toBeInTheDocument();
  });
});

// ============ 错误边界测试 ============

describe('A2UIRendererSafe - 错误边界', () => {
  it('正常组件能够渲染', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'safe-text',
      props: { content: 'Safe content' },
    };

    const onError = vi.fn();

    render(
      <A2UIRendererSafe
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
        onError={onError}
      />
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
    expect(onError).not.toHaveBeenCalled();
  });
});

// ============ 业务组件渲染测试 ============

describe('A2UIRenderer - 业务组件', () => {
  it('渲染 progress 组件', () => {
    const component: A2UIComponent = {
      type: 'progress',
      id: 'test-progress',
      props: { value: 75 },
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('渲染 badge 组件', () => {
    const component: A2UIComponent = {
      type: 'badge',
      id: 'test-badge',
      children: [
        { type: 'text', id: 'badge-text', props: { content: '新' } },
      ],
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={{}}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('新')).toBeInTheDocument();
  });
});

// ============ 复杂场景测试 ============

describe('A2UIRenderer - 复杂场景', () => {
  it('渲染嵌套的多层组件树', () => {
    const component: A2UIComponent = {
      type: 'card',
      id: 'root-card',
      children: [
        {
          type: 'card-header',
          id: 'header',
          children: [
            {
              type: 'card-title',
              id: 'title',
              children: [
                { type: 'text', id: 'title-text', props: { content: { binding: 'title' } } },
              ],
            },
            {
              type: 'card-description',
              id: 'desc',
              children: [
                { type: 'text', id: 'desc-text', props: { content: { binding: 'description' } } },
              ],
            },
          ],
        },
        {
          type: 'card-content',
          id: 'content',
          children: [
            {
              type: 'container',
              id: 'container',
              children: [
                {
                  type: 'text',
                  id: 'text-1',
                  props: { content: { binding: 'items.0' } },
                },
                {
                  type: 'text',
                  id: 'text-2',
                  props: { content: { binding: 'items.1' } },
                },
              ],
            },
          ],
        },
        {
          type: 'card-footer',
          id: 'footer',
          children: [
            {
              type: 'button',
              id: 'action-btn',
              actions: { click: 'card.confirm' },
              children: [
                { type: 'text', id: 'btn-text', props: { content: '确认' } },
              ],
            },
          ],
        },
      ],
    };

    const dataModel: A2UIDataModel = {
      title: '复杂卡片',
      description: '这是一个复杂的卡片组件',
      items: ['项目一', '项目二'],
    };

    render(
      <A2UIRenderer
        component={component}
        dataModel={dataModel}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('复杂卡片')).toBeInTheDocument();
    expect(screen.getByText('这是一个复杂的卡片组件')).toBeInTheDocument();
    expect(screen.getByText('项目一')).toBeInTheDocument();
    expect(screen.getByText('项目二')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('确认')).toBeInTheDocument();

    // 测试事件
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnAction).toHaveBeenCalledWith('action-btn', 'card.confirm', expect.anything());
  });

  it('动态更新数据模型后重新渲染', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'dynamic-text',
      props: { content: { binding: 'counter' } },
    };

    const { rerender } = render(
      <A2UIRenderer
        component={component}
        dataModel={{ counter: '0' }}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();

    rerender(
      <A2UIRenderer
        component={component}
        dataModel={{ counter: '10' }}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
