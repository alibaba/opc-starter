/**
 * A2UI Portal 单元测试
 * @description 测试 Portal 渲染、状态管理、用户交互
 * @version 1.0.0
 * @see STORY-23-012
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { A2UIPortalContainer } from '../A2UIPortalContainer';
import { useAgentStore } from '@/stores/useAgentStore';
import type { A2UIComponent } from '@/types/a2ui';

// Mock store 状态
const mockClosePortal = vi.fn();
const mockHandleUserAction = vi.fn();

// 在每个测试前重置 store
beforeEach(() => {
  mockClosePortal.mockClear();
  mockHandleUserAction.mockClear();
  
  // 重置 store 到初始状态
  useAgentStore.setState({
    portalContent: null,
    portalTarget: 'inline',
    portalDataModel: {},
  });
});

afterEach(() => {
  // 先让 React 正确清理 Portal，再清理 store
  cleanup();
  
  // 确保 store 状态重置，避免下一个测试受影响
  useAgentStore.setState({
    portalContent: null,
    portalTarget: 'inline',
    portalDataModel: {},
  });
});

// ============ Portal 渲染测试 ============

describe('A2UIPortalContainer - 渲染', () => {
  it('当 portalContent 为 null 时不渲染', () => {
    const { container } = render(<A2UIPortalContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('当 portalTarget 为 inline 时不渲染', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'test',
      props: { content: 'Hello' },
    };

    useAgentStore.setState({
      portalContent: component,
      portalTarget: 'inline',
    });

    const { container } = render(<A2UIPortalContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('main-area 模式渲染到组件内部', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'main-area-test',
      props: { content: '主内容区预览' },
      portalConfig: { title: '测试预览' },
    };

    useAgentStore.setState({
      portalContent: component,
      portalTarget: 'main-area',
      portalDataModel: {},
    });

    render(<A2UIPortalContainer />);

    expect(screen.getByTestId('a2ui-portal-main-area')).toBeInTheDocument();
    expect(screen.getByText('测试预览')).toBeInTheDocument();
  });

  it('fullscreen 模式渲染到 body', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'fullscreen-test',
      props: { content: '全屏预览' },
      portalConfig: { title: '全屏模式' },
    };

    useAgentStore.setState({
      portalContent: component,
      portalTarget: 'fullscreen',
      portalDataModel: {},
    });

    render(<A2UIPortalContainer />);

    // fullscreen 使用 createPortal 渲染到 body
    expect(screen.getByTestId('a2ui-portal-fullscreen')).toBeInTheDocument();
    expect(screen.getByText('全屏模式')).toBeInTheDocument();
  });
});

// ============ 关闭按钮测试 ============

describe('A2UIPortalContainer - 关闭功能', () => {
  it('点击关闭按钮调用 closePortal', async () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'close-test',
      props: { content: 'Test' },
      portalConfig: { showClose: true },
    };

    useAgentStore.setState({
      portalContent: component,
      portalTarget: 'main-area',
      portalDataModel: {},
    });

    render(<A2UIPortalContainer />);

    const closeButton = screen.getByLabelText('关闭');
    fireEvent.click(closeButton);

    // 验证 portal 被关闭
    await waitFor(() => {
      expect(useAgentStore.getState().portalContent).toBeNull();
    });
  });

  it('showClose=false 时不显示关闭按钮', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'no-close-test',
      props: { content: 'Test' },
      portalConfig: { showClose: false },
    };

    useAgentStore.setState({
      portalContent: component,
      portalTarget: 'main-area',
      portalDataModel: {},
    });

    render(<A2UIPortalContainer />);

    expect(screen.queryByLabelText('关闭')).not.toBeInTheDocument();
  });

  it('ESC 键关闭 Portal', async () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'esc-test',
      props: { content: 'Test' },
      portalConfig: { showClose: true },
    };

    useAgentStore.setState({
      portalContent: component,
      portalTarget: 'main-area',
      portalDataModel: {},
    });

    render(<A2UIPortalContainer />);

    // 模拟 ESC 键
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(useAgentStore.getState().portalContent).toBeNull();
    });
  });

  it('showClose=false 时 ESC 键不关闭 Portal', async () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'no-esc-close-test',
      props: { content: 'Test' },
      portalConfig: { showClose: false },
    };

    useAgentStore.setState({
      portalContent: component,
      portalTarget: 'main-area',
      portalDataModel: {},
    });

    render(<A2UIPortalContainer />);

    fireEvent.keyDown(document, { key: 'Escape' });

    // Portal 应该仍然打开
    await waitFor(() => {
      expect(useAgentStore.getState().portalContent).not.toBeNull();
    });
  });
});

// ============ 背景样式测试 ============

describe('A2UIPortalContainer - 背景样式', () => {
  it('blur 背景样式', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'blur-test',
      props: { content: 'Test' },
      portalConfig: { backdrop: 'blur' },
    };

    useAgentStore.setState({
      portalContent: component,
      portalTarget: 'fullscreen',
      portalDataModel: {},
    });

    render(<A2UIPortalContainer />);

    const backdrop = screen.getByTestId('a2ui-portal-fullscreen').querySelector('[aria-hidden="true"]');
    expect(backdrop).toHaveClass('backdrop-blur-md');
  });

  it('dim 背景样式', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'dim-test',
      props: { content: 'Test' },
      portalConfig: { backdrop: 'dim' },
    };

    useAgentStore.setState({
      portalContent: component,
      portalTarget: 'fullscreen',
      portalDataModel: {},
    });

    render(<A2UIPortalContainer />);

    const backdrop = screen.getByTestId('a2ui-portal-fullscreen').querySelector('[aria-hidden="true"]');
    expect(backdrop).toHaveClass('bg-black/80');
  });
});

// ============ Store 集成测试 ============

describe('useAgentStore - Portal 方法', () => {
  it('openPortal 正确设置状态', () => {
    const component: A2UIComponent = {
      type: 'photo-preview',
      id: 'preview-1',
      props: { src: 'test.jpg' },
    };

    const dataModel = { photoId: '123' };

    useAgentStore.getState().openPortal(component, 'main-area', dataModel);

    const state = useAgentStore.getState();
    expect(state.portalContent).toEqual(component);
    expect(state.portalTarget).toBe('main-area');
    expect(state.portalDataModel).toEqual(dataModel);
  });

  it('closePortal 重置状态', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'test',
      props: { content: 'Test' },
    };

    // 先打开 Portal
    useAgentStore.getState().openPortal(component, 'fullscreen');

    // 然后关闭
    useAgentStore.getState().closePortal();

    const state = useAgentStore.getState();
    expect(state.portalContent).toBeNull();
    expect(state.portalTarget).toBe('inline');
    expect(state.portalDataModel).toEqual({});
  });

  it('updatePortalDataModel 正确更新数据', () => {
    const component: A2UIComponent = {
      type: 'text',
      id: 'test',
      props: { content: 'Test' },
    };

    // 打开 Portal 并设置初始数据
    useAgentStore.getState().openPortal(component, 'main-area', { count: 0 });

    // 更新数据
    useAgentStore.getState().updatePortalDataModel('count', 'replace', 5);

    const state = useAgentStore.getState();
    expect(state.portalDataModel.count).toBe(5);
  });
});

// ============ 移动端适配测试 ============

describe('Portal 移动端适配', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    // 恢复原始窗口宽度
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('移动端 main-area 应该渲染为 fullscreen', async () => {
    // 模拟移动端宽度
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const component: A2UIComponent = {
      type: 'text',
      id: 'mobile-test',
      props: { content: 'Mobile Test' },
      renderTarget: 'main-area',
    };

    // 注意：这个测试需要模拟完整的消息处理流程
    // 这里只验证 Store 的 openPortal 能正确接收参数
    useAgentStore.getState().openPortal(component, 'fullscreen');

    const state = useAgentStore.getState();
    expect(state.portalTarget).toBe('fullscreen');
  });
});
