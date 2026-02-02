/**
 * AvatarCropper Component
 * 头像裁剪组件 - 使用 react-easy-crop
 */

import { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface AvatarCropperProps {
  image: string;
  onComplete: (file: File) => void;
  onCancel: () => void;
}

interface CroppedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function AvatarCropper({ image, onComplete, onCancel }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedArea | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 处理裁剪区域变化
   */
  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: CroppedArea) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  /**
   * 创建裁剪后的图片
   */
  const createCroppedImage = async (): Promise<Blob> => {
    if (!croppedAreaPixels) {
      throw new Error('No cropped area');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // 设置画布大小为裁剪区域大小
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        // 绘制裁剪后的图片
        ctx.drawImage(
          img,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );

        // 转换为 Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          0.95
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = image;
    });
  };

  /**
   * 处理确认裁剪
   */
  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      const croppedBlob = await createCroppedImage();
      const croppedFile = new File([croppedBlob], 'avatar.jpg', {
        type: 'image/jpeg',
      });
      onComplete(croppedFile);
    } catch (error) {
      console.error('Failed to crop image:', error);
      alert('裁剪失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>裁剪头像</DialogTitle>
        </DialogHeader>

        {/* 裁剪区域 */}
        <div className="relative w-full h-[400px] bg-muted">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* 缩放控制 */}
        <div className="flex items-center gap-4 px-6 py-4">
          <ZoomOut className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(value) => setZoom(value[0])}
            className="flex-1"
            aria-label="缩放"
          />
          <ZoomIn className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>

        {/* 操作按钮 */}
        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? '处理中...' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}