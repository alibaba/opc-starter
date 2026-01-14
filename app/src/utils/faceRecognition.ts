import { faker } from '@faker-js/faker';
import type { Face } from '@/types/photo';
import { MOCK_PERSONS } from '@/mocks/data/mockPersons';
import { FACE_RECOGNITION_CONFIG } from '@/config/constants';

/**
 * Mock人脸识别算法
 * 模拟1秒延迟，随机生成1-5个人脸及其位置信息
 */
export async function mockFaceRecognition(): Promise<Face[]> {
  // 模拟识别延迟
  await new Promise(resolve => 
    setTimeout(resolve, FACE_RECOGNITION_CONFIG.MOCK_DELAY)
  );

  // 随机生成人脸数量（1-5个）
  const faceCount = faker.number.int({ 
    min: 1, 
    max: Math.min(5, FACE_RECOGNITION_CONFIG.MAX_FACES_PER_PHOTO) 
  });

  const faces: Face[] = [];
  const usedPersons = new Set<string>();

  for (let i = 0; i < faceCount; i++) {
    // 随机选择一个未使用的人员
    let person;
    let attempts = 0;
    do {
      person = faker.helpers.arrayElement(MOCK_PERSONS);
      attempts++;
    } while (usedPersons.has(person.id) && attempts < 20);

    if (usedPersons.has(person.id)) continue;
    usedPersons.add(person.id);

    // 生成随机人脸边界框（确保不重叠）
    const face: Face = {
      id: `face-${Date.now()}-${i}`,
      personId: person.id,
      personName: person.name,
      boundingBox: {
        x: faker.number.int({ min: 5 + i * 20, max: 70 - i * 10 }),
        y: faker.number.int({ min: 5 + i * 15, max: 70 - i * 10 }),
        width: faker.number.int({ min: 15, max: 25 }),
        height: faker.number.int({ min: 20, max: 30 }),
      },
      confidence: faker.number.float({ 
        min: FACE_RECOGNITION_CONFIG.MIN_CONFIDENCE, 
        max: 0.99, 
        multipleOf: 0.01 
      }),
    };

    faces.push(face);
  }

  return faces;
}