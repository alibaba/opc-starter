import { faker } from '@faker-js/faker';
import type { Photo, Face, PhotoMetadata } from '@/types/photo';
import { MOCK_PERSONS } from './mockPersons';

/**
 * 生成随机人脸数据
 */
function generateRandomFaces(photoId: string, count: number = 1): Face[] {
  const faces: Face[] = [];
  const usedPersons = new Set<string>();

  for (let i = 0; i < count; i++) {
    // 随机选择一个未使用的人员
    let person;
    let attempts = 0;
    do {
      person = faker.helpers.arrayElement(MOCK_PERSONS);
      attempts++;
    } while (usedPersons.has(person.id) && attempts < 20);

    if (usedPersons.has(person.id)) continue;
    usedPersons.add(person.id);

    const face: Face = {
      id: `face-${photoId}-${i + 1}`,
      personId: person.id,
      personName: person.name,
      boundingBox: {
        x: faker.number.int({ min: 10, max: 60 }),
        y: faker.number.int({ min: 10, max: 60 }),
        width: faker.number.int({ min: 15, max: 30 }),
        height: faker.number.int({ min: 20, max: 35 }),
      },
      confidence: faker.number.float({ min: 0.75, max: 0.99, multipleOf: 0.01 }),
    };

    faces.push(face);
  }

  return faces;
}

/**
 * 生成Mock照片数据
 */
function generateMockPhotos(count: number = 80): Photo[] {
  const photos: Photo[] = [];

  for (let i = 0; i < count; i++) {
    const photoId = `photo-${i + 1}`;
    const width = faker.helpers.arrayElement([1920, 1280, 1600, 2048]);
    const height = faker.helpers.arrayElement([1080, 720, 900, 1536]);

    // 生成随机数量的人脸（1-5个）
    const faceCount = faker.number.int({ min: 1, max: 5 });
    const faces = generateRandomFaces(photoId, faceCount);

    // 生成随机标签
    const tags = faker.helpers.arrayElements(
      ['团建', '年会', '技术分享', '产品发布', '办公', '聚餐', '户外', '培训'],
      faker.number.int({ min: 0, max: 3 })
    );

    const metadata: PhotoMetadata = {
      width,
      height,
      size: faker.number.int({ min: 500000, max: 8000000 }), // 0.5MB-8MB
      format: faker.helpers.arrayElement(['jpg', 'png', 'jpeg']),
    };

    // 使用占位图片URL（实际项目中会上传真实图片）
    const base64 = `data:image/jpeg;base64,${faker.image.dataUri()}`;
    const thumbnail = `data:image/jpeg;base64,${faker.image.dataUri()}`;

    const photo: Photo = {
      id: photoId,
      base64,
      thumbnail,
      uploadedAt: faker.date.between({ 
        from: '2023-01-01', 
        to: '2025-12-31' 
      }),
      tags,
      faces,
      metadata,
      isMockData: true, // 标记为 Mock 数据
    };

    photos.push(photo);
  }

  return photos;
}

/**
 * 导出80张Mock照片
 */
export const MOCK_PHOTOS = generateMockPhotos(80);
