/**
 * A2UI Action Handler
 * @description 处理 A2UI 组件触发的本地 actions
 * @story STORY-23-010
 */

import { supabase } from '@/lib/supabase/client';
import { uploadToOSS } from '@/lib/oss/client';
import { usePhotoEditorStore } from '@/stores/usePhotoEditorStore';
import { usePhotoStore } from '@/stores/usePhotoStore';
import { useViewContextStore } from '@/stores/useViewContextStore';
import { photoDB } from '@/services/db/photoDB';
import { generateThumbnail } from '@/services/photoEditor/saveService';
import type { Photo } from '@/types/photo';

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * 将 base64 转换为 Blob
 */
function base64ToBlob(base64: string, mimeType = 'image/webp'): Blob {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * 获取图片尺寸
 */
async function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = base64;
  });
}

/**
 * 滤镜参数类型
 */
interface FilterParams {
  filter: string;
  brightness: number;
  contrast: number;
  saturation: number;
}

/**
 * 获取滤镜的 CSS filter 字符串
 */
function getFilterCSS(filterName: string): string {
  const filterMap: Record<string, string> = {
    original: '',
    grayscale: 'grayscale(100%)',
    sepia: 'sepia(100%)',
    vintage: 'sepia(50%) contrast(90%) brightness(90%)',
    warm: 'sepia(30%) saturate(140%)',
    cool: 'hue-rotate(180deg) saturate(70%)',
    dramatic: 'contrast(150%) saturate(120%)',
    fade: 'contrast(80%) brightness(110%) saturate(80%)',
    vivid: 'saturate(150%) contrast(110%)',
    noir: 'grayscale(100%) contrast(120%)',
  };
  return filterMap[filterName] || '';
}

/**
 * 将滤镜应用到图片并返回 base64
 */
async function applyFiltersToImage(
  imageSource: string,
  params: FilterParams
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      reject(new Error('图片加载超时'));
    }, 30000);
    
    img.onload = () => {
      clearTimeout(timeout);
      
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 构建 CSS filter 字符串
        const filters: string[] = [];
        
        // 应用预设滤镜
        const filterCSS = getFilterCSS(params.filter);
        if (filterCSS) {
          filters.push(filterCSS);
        }
        
        // 应用亮度调整 (brightness: -100 to 100 -> CSS: 0% to 200%)
        if (params.brightness !== 0) {
          filters.push(`brightness(${100 + params.brightness}%)`);
        }
        
        // 应用对比度调整 (contrast: -100 to 100 -> CSS: 0% to 200%)
        if (params.contrast !== 0) {
          filters.push(`contrast(${100 + params.contrast}%)`);
        }
        
        // 应用饱和度调整 (saturation: -100 to 100 -> CSS: 0% to 200%)
        if (params.saturation !== 0) {
          filters.push(`saturate(${100 + params.saturation}%)`);
        }
        
        // 应用滤镜
        if (filters.length > 0) {
          ctx.filter = filters.join(' ');
        }
        
        // 绘制图片
        ctx.drawImage(img, 0, 0);
        
        // 转换为 base64
        const result = canvas.toDataURL('image/webp', 0.92);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('加载图片失败'));
    };
    
    img.src = imageSource;
  });
}

/**
 * 保存编辑后的照片为新照片
 * @description 另存为新照片，不覆盖原图
 * 
 * 改进（参考 AI 融合逻辑）：
 * - 如果在团队视角下，保存到当前团队（设置 organization_id 和 visibility）
 * - 日期更新到当天（设置 taken_at）
 * - 支持应用滤镜和调参后保存
 */
export async function saveEditedPhotoAsNew(options?: {
  onProgress?: (progress: number, message: string) => void;
}): Promise<ActionResult> {
  const { onProgress } = options || {};
  
  try {
    const { originalPhoto, currentImage, filter, brightness, contrast, saturation } = usePhotoEditorStore.getState();
    
    console.log('[A2UI ActionHandler] 保存编辑后的照片:', {
      hasOriginalPhoto: !!originalPhoto,
      hasCurrentImage: !!currentImage,
      currentImageLength: currentImage?.length || 0,
      filter,
      brightness,
      contrast,
      saturation,
    });
    
    if (!originalPhoto) {
      return { success: false, error: '没有正在编辑的照片' };
    }
    
    // 获取图片源：优先使用 currentImage，否则从原图获取
    let imageSource = currentImage;
    
    // 如果 currentImage 为空，需要从原图获取并应用滤镜
    if (!imageSource) {
      const originalSource = originalPhoto.oss_url || originalPhoto.oss_compressed_url || originalPhoto.base64;
      
      if (!originalSource) {
        return { success: false, error: '无法获取原图数据' };
      }
      
      // 如果有滤镜或调参变化，需要应用到原图
      const hasFilterChanges = filter !== 'original' || brightness !== 0 || contrast !== 0 || saturation !== 0;
      
      if (hasFilterChanges) {
        console.log('[A2UI ActionHandler] 需要从原图应用滤镜...');
        // 将原图转换为 base64 并应用滤镜
        imageSource = await applyFiltersToImage(originalSource, { filter, brightness, contrast, saturation });
      } else {
        return { success: false, error: '照片未修改，无需保存' };
      }
    }
    
    if (!imageSource) {
      return { success: false, error: '没有编辑后的图像数据' };
    }
    
    // 检查是否有修改
    const hasChanges = 
      imageSource !== originalPhoto.base64 ||
      filter !== 'original' ||
      brightness !== 0 ||
      contrast !== 0 ||
      saturation !== 0;
      
    if (!hasChanges) {
      return { success: false, error: '照片未修改，无需保存' };
    }
    
    // 使用处理后的 imageSource 替换 currentImage
    const finalImage = imageSource;
    
    // 1. 获取用户信息
    onProgress?.(5, '验证用户...');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: '用户未登录' };
    }
    const userId = session.user.id;
    
    // 2. 获取当前视图上下文（团队信息）
    const { viewMode, selectedOrgId, selectedOrgName } = useViewContextStore.getState();
    const isTeamView = viewMode === 'team' && selectedOrgId;
    
    console.log('[A2UI ActionHandler] 视图上下文:', {
      viewMode,
      selectedOrgId,
      selectedOrgName,
      isTeamView,
    });
    
    // 3. 生成新的照片 ID
    const newPhotoId = crypto.randomUUID();
    onProgress?.(10, '准备新照片...');
    
    // 4. 生成缩略图
    onProgress?.(15, '生成缩略图...');
    const thumbnailBase64 = await generateThumbnail(finalImage, {
      maxWidth: 300,
      maxHeight: 300,
      quality: 0.8,
    });
    
    // 5. 获取图片尺寸
    onProgress?.(20, '获取图片信息...');
    const dimensions = await getImageDimensions(finalImage);
    
    // 6. 转换为 Blob/File
    onProgress?.(25, '准备上传...');
    const imageBlob = base64ToBlob(finalImage, 'image/webp');
    const imageFile = new File([imageBlob], 'compressed.webp', { type: 'image/webp' });
    
    // 缩略图也使用 webp 格式（OSS 配置要求）
    const thumbnailBlob = base64ToBlob(thumbnailBase64, 'image/webp');
    const thumbnailFile = new File([thumbnailBlob], 'thumbnail.webp', { type: 'image/webp' });
    
    // 7. 上传压缩图到 OSS
    onProgress?.(30, '上传图片到云端...');
    const compressedResult = await uploadToOSS(
      imageFile,
      userId,
      newPhotoId,
      {
        fileType: 'compressed',
        onProgress: (progress) => {
          const uploadProgress = 30 + progress * 0.3;
          onProgress?.(uploadProgress, `上传图片 ${Math.round(progress)}%...`);
        },
      }
    );
    
    // 8. 上传缩略图到 OSS
    onProgress?.(65, '上传缩略图...');
    const thumbnailResult = await uploadToOSS(
      thumbnailFile,
      userId,
      newPhotoId,
      {
        fileType: 'thumbnail',
        onProgress: (progress) => {
          const uploadProgress = 65 + progress * 0.15;
          onProgress?.(uploadProgress, `上传缩略图 ${Math.round(progress)}%...`);
        },
      }
    );
    
    // 9. 创建数据库记录
    onProgress?.(80, '保存照片记录...');
    const now = new Date().toISOString();
    
    // 基础照片数据（注意：photos 表没有 source_photo_id 列）
    const newPhotoData: Record<string, unknown> = {
      id: newPhotoId,
      user_id: userId,
      
      // OSS URLs
      oss_compressed_url: compressedResult.url,
      oss_thumbnail_url: thumbnailResult.url,
      
      // 兼容字段
      oss_url: compressedResult.url,
      oss_key: compressedResult.ossKey,
      
      // 元数据
      width: dimensions.width,
      height: dimensions.height,
      file_size: imageFile.size,
      mime_type: 'image/webp',
      
      // 状态
      processing_status: 'completed',
      
      // 📅 日期更新到当天（关键改动）
      taken_at: now,
      
      // 时间戳
      created_at: now,
      updated_at: now,
    };
    
    // 🏢 如果在团队视角下，保存到当前团队（关键改动）
    if (isTeamView) {
      newPhotoData.organization_id = selectedOrgId;
      newPhotoData.visibility = 'organization';
      console.log('[A2UI ActionHandler] 保存到团队:', selectedOrgName, selectedOrgId);
    }
    
    const { error: insertError } = await supabase
      .from('photos')
      .insert(newPhotoData);
    
    if (insertError) {
      console.error('[A2UI ActionHandler] 保存失败:', insertError);
      return { success: false, error: `保存失败: ${insertError.message}` };
    }
    
    // 10. 同步到本地 IndexedDB 和 UI 状态
    onProgress?.(90, '同步本地数据...');
    const localPhoto: Photo = {
      id: newPhotoId,
      base64: finalImage,
      thumbnail: thumbnailBase64,
      uploadedAt: new Date(),
      takenAt: new Date(), // 日期更新到当天
      tags: originalPhoto.tags?.map(t => t) || [],
      faces: [],
      metadata: {
        width: dimensions.width,
        height: dimensions.height,
        size: imageFile.size,
        format: 'image/webp',
      },
      cloudSyncStatus: 'synced',
      cloudUrl: compressedResult.url,
      oss_url: compressedResult.url,
      oss_key: compressedResult.ossKey,
      oss_compressed_url: compressedResult.url,
      oss_thumbnail_url: thumbnailResult.url,
    };
    
    // 同步到 IndexedDB
    await photoDB.addPhotos([localPhoto]);
    
    // 同步到 UI 状态（确保新照片立即显示在相册中）
    usePhotoStore.getState().addPhotos([localPhoto]);
    
    onProgress?.(100, '保存完成！');
    
    // 构建成功消息
    const successMessage = isTeamView 
      ? `已另存为新照片，并保存到团队「${selectedOrgName}」`
      : '已另存为新照片';
    
    console.log('[A2UI ActionHandler] 照片另存成功:', newPhotoId);
    
    // 保存成功后重置编辑状态，这样 A2UI 卡片的 "未保存" 状态会消失
    usePhotoEditorStore.getState().reset();
    
    return {
      success: true,
      message: successMessage,
      data: {
        newPhotoId,
        sourcePhotoId: originalPhoto.id,
        thumbnailUrl: thumbnailResult.url,
        imageUrl: compressedResult.url,
        // 返回团队信息供 UI 展示
        savedToTeam: isTeamView,
        teamId: isTeamView ? selectedOrgId : null,
        teamName: isTeamView ? selectedOrgName : null,
      },
    };
  } catch (error) {
    console.error('[A2UI ActionHandler] 保存失败:', error);
    return {
      success: false,
      error: `保存失败: ${(error as Error).message}`,
    };
  }
}

/**
 * 导航到指定页面
 * @description 用于复杂编辑引导跳转
 */
function navigateTo(path: string): ActionResult {
  // 使用 window.location 进行导航
  // 在 SPA 中可以考虑使用 router.push，但这里保持简单
  window.location.href = path;
  return { success: true, message: `正在跳转到 ${path}` };
}

/**
 * 处理 A2UI 组件触发的 action
 * @description 根据 actionId 路由到对应的处理函数
 */
export async function handleA2UIAction(
  actionId: string,
  _componentId: string,
  value?: unknown
): Promise<ActionResult> {
  console.log('[A2UI ActionHandler] 处理 action:', actionId, value);
  
  switch (actionId) {
    // === 照片编辑 ===
    case 'photo.edit.saveAsNew':
      return saveEditedPhotoAsNew();
    
    case 'photo.edit.reset':
      usePhotoEditorStore.getState().reset();
      return { success: true, message: '已重置编辑' };
    
    case 'photo.edit.undo':
      usePhotoEditorStore.getState().undo();
      return { success: true, message: '已撤销' };
    
    case 'photo.edit.redo':
      usePhotoEditorStore.getState().redo();
      return { success: true, message: '已重做' };
    
    // === 照片编辑确认（来自 PhotoEditConfirm 组件按钮点击） ===
    case 'photo.edit.confirm': {
      // value 是按钮 ID: 'saveAsNew' | 'cancel' | 'reset' | 'applyOriginal'
      const buttonId = value as string;
      
      switch (buttonId) {
        case 'saveAsNew':
          return saveEditedPhotoAsNew();
        
        case 'cancel':
          usePhotoEditorStore.getState().reset();
          return { success: true, message: '已取消编辑' };
        
        case 'reset':
          usePhotoEditorStore.getState().reset();
          return { success: true, message: '已重置编辑' };
        
        case 'applyOriginal':
          // 应用到原图暂不支持，提示用户
          return { 
            success: false, 
            error: '暂不支持覆盖原图，请使用"另存为新照片"' 
          };
        
        default:
          return { success: false, error: `未知按钮操作: ${buttonId}` };
      }
    }
    
    // === 导航跳转（复杂编辑引导） ===
    case 'navigation.openEditor': {
      // 如果有正在编辑的照片，带上 photoId
      const { originalPhoto } = usePhotoEditorStore.getState();
      const photoId = originalPhoto?.id;
      const path = photoId ? `/photo-editor?photoId=${photoId}` : '/photo-editor';
      return navigateTo(path);
    }
    
    case 'navigation.openAIStudio':
      return navigateTo('/ai-studio/fusion');
    
    case 'navigation.timeline':
      return navigateTo('/timeline');
    
    case 'navigation.albums':
      return navigateTo('/albums');
    
    case 'navigation.search':
      return navigateTo('/search');
    
    case 'navigation.persons':
      return navigateTo('/persons');
    
    default:
      console.warn('[A2UI ActionHandler] 未知 action:', actionId);
      return { success: false, error: `未知操作: ${actionId}` };
  }
}

export default handleA2UIAction;
