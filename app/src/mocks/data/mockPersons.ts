import { faker } from '@faker-js/faker/locale/zh_CN';
import type { Person } from '@/types/person';
import { DEPARTMENTS } from '@/config/constants';

/**
 * 生成Mock人员数据
 */
function generateMockPersons(count: number = 15): Person[] {
  const persons: Person[] = [];

  for (let i = 0; i < count; i++) {
    const person: Person = {
      id: `person-${i + 1}`,
      name: faker.person.fullName(),
      avatar: faker.image.avatar(),
      department: faker.helpers.arrayElement(DEPARTMENTS as unknown as string[]),
      joinedAt: faker.date.between({ 
        from: '2020-01-01', 
        to: '2024-12-31' 
      }),
      photoCount: 0, // 初始为0，后续根据照片统计
    };

    persons.push(person);
  }

  return persons;
}

/**
 * 导出15个Mock人员
 */
export const MOCK_PERSONS = generateMockPersons(15);
