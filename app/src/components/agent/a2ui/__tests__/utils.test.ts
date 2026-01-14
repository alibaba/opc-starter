/**
 * A2UI Utils 测试
 * @description 测试数据绑定解析、事件包装等工具函数
 */

import { describe, it, expect, vi } from 'vitest';
import { wrapActions, getByPath, resolveBindings } from '../utils';

describe('wrapActions', () => {
  describe('事件名称转换', () => {
    it('应该将 click 转换为 onClick', () => {
      const onAction = vi.fn();
      const handlers = wrapActions(
        { click: 'test.action' },
        onAction,
        'comp-1'
      );

      expect(handlers).toHaveProperty('onClick');
      expect(typeof handlers.onClick).toBe('function');
    });

    it('应该将 change 转换为 onChange', () => {
      const onAction = vi.fn();
      const handlers = wrapActions(
        { change: 'test.change' },
        onAction,
        'comp-1'
      );

      expect(handlers).toHaveProperty('onChange');
    });

    // 🔴 RED: 这是关键测试 - 防止 onOnClick 问题
    it('不应该将 onClick 转换为 onOnClick（已有 on 前缀）', () => {
      const onAction = vi.fn();
      const handlers = wrapActions(
        { onClick: 'test.action' },
        onAction,
        'comp-1'
      );

      // 应该保持为 onClick，而不是 onOnClick
      expect(handlers).toHaveProperty('onClick');
      expect(handlers).not.toHaveProperty('onOnClick');
    });

    it('不应该将 onChange 转换为 onOnChange', () => {
      const onAction = vi.fn();
      const handlers = wrapActions(
        { onChange: 'test.change' },
        onAction,
        'comp-1'
      );

      expect(handlers).toHaveProperty('onChange');
      expect(handlers).not.toHaveProperty('onOnChange');
    });

    it('应该正确处理 onButtonClick 等自定义事件名', () => {
      const onAction = vi.fn();
      const handlers = wrapActions(
        { onButtonClick: 'button.click' },
        onAction,
        'comp-1'
      );

      // 应该保持为 onButtonClick，而不是 onOnButtonClick
      expect(handlers).toHaveProperty('onButtonClick');
      expect(handlers).not.toHaveProperty('onOnButtonClick');
    });
  });

  describe('事件处理器调用', () => {
    it('调用处理器时应触发 onAction 回调', () => {
      const onAction = vi.fn();
      const handlers = wrapActions(
        { click: 'photo.edit.save' },
        onAction,
        'save-btn'
      );

      handlers.onClick?.();

      expect(onAction).toHaveBeenCalledWith(
        'save-btn',
        'photo.edit.save',
        undefined
      );
    });

    it('应该传递 value 参数', () => {
      const onAction = vi.fn();
      const handlers = wrapActions(
        { change: 'slider.change' },
        onAction,
        'brightness-slider'
      );

      handlers.onChange?.(50);

      expect(onAction).toHaveBeenCalledWith(
        'brightness-slider',
        'slider.change',
        50
      );
    });
  });

  describe('边界情况', () => {
    it('actions 为 undefined 时应返回空对象', () => {
      const onAction = vi.fn();
      const handlers = wrapActions(undefined, onAction, 'comp-1');

      expect(handlers).toEqual({});
    });

    it('actions 为空对象时应返回空对象', () => {
      const onAction = vi.fn();
      const handlers = wrapActions({}, onAction, 'comp-1');

      expect(handlers).toEqual({});
    });
  });
});

describe('getByPath', () => {
  it('应该获取嵌套对象的值', () => {
    const obj = {
      photos: [{ url: 'https://example.com/1.jpg' }],
    };

    expect(getByPath(obj, 'photos.0.url')).toBe('https://example.com/1.jpg');
  });

  it('路径不存在时应返回 undefined', () => {
    const obj = { foo: 'bar' };

    expect(getByPath(obj, 'baz.qux')).toBeUndefined();
  });
});

describe('resolveBindings', () => {
  it('应该解析绑定值', () => {
    const props = {
      src: { binding: 'photo.url' },
      alt: '静态值',
    };
    const dataModel = {
      photo: { url: 'https://example.com/photo.jpg' },
    };

    const resolved = resolveBindings(props, dataModel);

    expect(resolved).toEqual({
      src: 'https://example.com/photo.jpg',
      alt: '静态值',
    });
  });
});
