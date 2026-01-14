import { http, HttpResponse, delay } from 'msw';
import { personDB } from '@/services/db/personDB';
import { photoDB } from '@/services/db/photoDB';
import type { Person } from '@/types/person';
import type { Photo } from '@/types/photo';
import type { ApiResponse } from '@/types/api';
import { getRandomDelay } from '../data/mockConfig';

export const personHandlers = [
  /**
   * 获取人员列表
   * GET /api/persons
   */
  http.get('/api/persons', async () => {
    await delay(getRandomDelay());

    const persons = await personDB.getPersons();

    // 更新每个人员的照片数量
    const personsWithCount = await Promise.all(
      persons.map(async (person) => {
        const photos = await photoDB.getPhotosByPerson(person.id);
        return {
          ...person,
          photoCount: photos.length,
        };
      })
    );

    return HttpResponse.json<ApiResponse<Person[]>>({
      success: true,
      data: personsWithCount,
    });
  }),

  /**
   * 获取人员详情
   * GET /api/persons/:id
   */
  http.get<{ id: string }>('/api/persons/:id', async ({ params }) => {
    await delay(getRandomDelay());

    const { id } = params;
    const person = await personDB.getPerson(id);

    if (!person) {
      return HttpResponse.json<ApiResponse>(
        { success: false, error: '人员不存在' },
        { status: 404 }
      );
    }

    // 更新照片数量
    const photos = await photoDB.getPhotosByPerson(id);
    const personWithCount = {
      ...person,
      photoCount: photos.length,
    };

    return HttpResponse.json<ApiResponse<Person>>({
      success: true,
      data: personWithCount,
    });
  }),

  /**
   * 获取人员相关照片
   * GET /api/persons/:id/photos
   */
  http.get<{ id: string }>('/api/persons/:id/photos', async ({ params }) => {
    await delay(getRandomDelay());

    const { id } = params;
    const person = await personDB.getPerson(id);

    if (!person) {
      return HttpResponse.json<ApiResponse>(
        { success: false, error: '人员不存在' },
        { status: 404 }
      );
    }

    const photos = await photoDB.getPhotosByPerson(id);

    return HttpResponse.json<ApiResponse<Photo[]>>({
      success: true,
      data: photos,
    });
  }),
];
