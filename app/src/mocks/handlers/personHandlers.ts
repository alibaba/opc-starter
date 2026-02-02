import { http, HttpResponse, delay } from 'msw'
import { personDB } from '@/services/db/personDB'
import type { Person } from '@/types/person'
import type { ApiResponse } from '@/types/api'
import { getRandomDelay } from '../data/mockConfig'

export const personHandlers = [
  /**
   * 获取人员列表
   * GET /api/persons
   */
  http.get('/api/persons', async () => {
    await delay(getRandomDelay())

    const persons = await personDB.getPersons()

    return HttpResponse.json<ApiResponse<Person[]>>({
      success: true,
      data: persons,
    })
  }),

  /**
   * 获取人员详情
   * GET /api/persons/:id
   */
  http.get<{ id: string }>('/api/persons/:id', async ({ params }) => {
    await delay(getRandomDelay())

    const { id } = params
    const person = await personDB.getPerson(id)

    if (!person) {
      return HttpResponse.json<ApiResponse>(
        { success: false, error: '人员不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json<ApiResponse<Person>>({
      success: true,
      data: person,
    })
  }),
]
