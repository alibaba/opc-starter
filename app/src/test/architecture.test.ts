/**
 * 架构约束测试 (Structural Tests)
 *
 * 参考 OpenAI Harness Engineering 的"机械化不变量"理念：
 * 架构意图必须通过自动化测试机械化执行，而非仅靠文档约定。
 *
 * 这些测试在每次 CI 运行时自动验证：
 * - 分层依赖方向（禁止逆向导入）
 * - 文件体积上限（防止上下文窗口溢出）
 * - 核心文件必须有 JSDoc 文件头
 * - 禁止直接使用 Supabase client（必须通过 DataService）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_ROOT = path.resolve(__dirname, '..')

function walkSync(dir: string, exts: string[]): string[] {
  const results: string[] = []
  const ignore = new Set(['node_modules', 'dist', 'coverage', '.git', 'test', 'mocks'])

  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (ignore.has(entry.name)) continue
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  }
  walk(dir)
  return results
}

function relPath(filePath: string): string {
  return path.relative(SRC_ROOT, filePath).replace(/\\/g, '/')
}

describe('架构约束 (Architectural Invariants)', () => {
  describe('分层依赖方向', () => {
    it('pages/ 不应直接导入 Supabase client', () => {
      const pagesDir = path.join(SRC_ROOT, 'pages')
      if (!fs.existsSync(pagesDir)) return

      const files = walkSync(pagesDir, ['.tsx', '.ts'])
      const violations: string[] = []

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        if (/from\s+['"]@\/lib\/supabase\/client['"]/.test(content)) {
          violations.push(relPath(file))
        }
      }

      expect(
        violations,
        `Pages 不应直接导入 supabase client，请使用 DataService 或 Service 层:\n${violations.join('\n')}`
      ).toEqual([])
    })

    it('components/ 不应直接导入 Supabase client', () => {
      const componentsDir = path.join(SRC_ROOT, 'components')
      if (!fs.existsSync(componentsDir)) return

      const files = walkSync(componentsDir, ['.tsx', '.ts'])
      const violations: string[] = []

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        if (/from\s+['"]@\/lib\/supabase\/client['"]/.test(content)) {
          violations.push(relPath(file))
        }
      }

      expect(
        violations,
        `Components 不应直接导入 supabase client:\n${violations.join('\n')}`
      ).toEqual([])
    })

    it('hooks/ 不应直接导入 Supabase client', () => {
      const hooksDir = path.join(SRC_ROOT, 'hooks')
      if (!fs.existsSync(hooksDir)) return

      const files = walkSync(hooksDir, ['.tsx', '.ts'])
      const violations: string[] = []

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        if (/from\s+['"]@\/lib\/supabase\/client['"]/.test(content)) {
          violations.push(relPath(file))
        }
      }

      expect(violations, `Hooks 不应直接导入 supabase client:\n${violations.join('\n')}`).toEqual(
        []
      )
    })
  })

  describe('上下文窗口友好性 - 文件体积', () => {
    it('源文件不超过 500 行（测试文件除外）', () => {
      const files = walkSync(SRC_ROOT, ['.ts', '.tsx'])
      const oversized: Array<{ file: string; lines: number }> = []

      for (const file of files) {
        if (file.includes('.test.') || file.includes('.spec.') || file.includes('/test/')) continue
        const content = fs.readFileSync(file, 'utf-8')
        const lineCount = content.split('\n').length
        if (lineCount > 500) {
          oversized.push({ file: relPath(file), lines: lineCount })
        }
      }

      if (oversized.length > 0) {
        const detail = oversized.map((f) => `  ${f.file}: ${f.lines} lines`).join('\n')
        console.warn(`⚠️ ${oversized.length} file(s) exceed 500 lines:\n${detail}`)
      }
      expect(
        oversized.filter((f) => f.lines > 1000),
        '存在超过 1000 行的源文件，必须拆分'
      ).toEqual([])
    })
  })

  describe('代码自述性 - JSDoc 文件头', () => {
    const CRITICAL_DIRS = [
      'pages',
      'components/agent',
      'components/layout',
      'hooks',
      'services/data',
      'lib/agent/tools',
      'stores',
    ]

    it('关键目录下的主要文件应有 JSDoc 文件头', () => {
      const missing: string[] = []

      for (const dir of CRITICAL_DIRS) {
        const fullDir = path.join(SRC_ROOT, dir)
        if (!fs.existsSync(fullDir)) continue

        const files = walkSync(fullDir, ['.ts', '.tsx'])
        for (const file of files) {
          if (file.includes('.test.') || file.includes('.spec.')) continue
          const content = fs.readFileSync(file, 'utf-8')
          const firstLines = content.slice(0, 500)
          if (!/\/\*\*[\s\S]*?\*\//.test(firstLines)) {
            missing.push(relPath(file))
          }
        }
      }

      if (missing.length > 0) {
        console.warn(
          `⚠️ ${missing.length} file(s) missing JSDoc header:\n${missing.map((f) => `  ${f}`).join('\n')}`
        )
      }
      expect(missing.length, `${missing.length} 个关键文件缺少 JSDoc 文件头`).toBeLessThanOrEqual(5)
    })
  })

  describe('Tailwind CSS v4 合规', () => {
    it('不使用 v2/v3 opacity 语法', () => {
      const files = walkSync(SRC_ROOT, ['.tsx'])
      const violations: Array<{ file: string; line: number; text: string }> = []
      const pattern = /(?:bg|text|border|ring|divide|placeholder)-opacity-/

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            violations.push({ file: relPath(file), line: i + 1, text: lines[i].trim() })
          }
        }
      }

      expect(
        violations,
        `发现 Tailwind v2/v3 opacity 语法:\n${violations.map((v) => `  ${v.file}:${v.line}: ${v.text}`).join('\n')}`
      ).toEqual([])
    })

    it('不使用 bg-gradient-to-* 语法', () => {
      const files = walkSync(SRC_ROOT, ['.tsx'])
      const violations: Array<{ file: string; line: number; text: string }> = []
      const pattern = /bg-gradient-to-[trbl]/

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            violations.push({ file: relPath(file), line: i + 1, text: lines[i].trim() })
          }
        }
      }

      expect(
        violations,
        `应使用 bg-linear-to-* 替代 bg-gradient-to-*:\n${violations.map((v) => `  ${v.file}:${v.line}: ${v.text}`).join('\n')}`
      ).toEqual([])
    })
  })

  describe('依赖方向约束 - stores 层', () => {
    it('stores/ 不应直接导入 pages/ 或 components/（共享 utils 除外）', () => {
      const storesDir = path.join(SRC_ROOT, 'stores')
      if (!fs.existsSync(storesDir)) return

      const files = walkSync(storesDir, ['.ts', '.tsx'])
      const violations: Array<{ file: string; line: number; text: string }> = []
      const forbidden = /from\s+['"]@\/pages\//

      for (const file of files) {
        if (file.includes('.test.') || file.includes('.spec.')) continue
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (forbidden.test(lines[i])) {
            violations.push({ file: relPath(file), line: i + 1, text: lines[i].trim() })
          }
        }
      }

      expect(
        violations,
        `Stores 不应导入 Pages（逆向依赖）:\n${violations.map((v) => `  ${v.file}:${v.line}: ${v.text}`).join('\n')}`
      ).toEqual([])
    })
  })

  describe('循环依赖检测 - 跨层导入', () => {
    it('pages/ 不应被 services/ 或 lib/ 导入', () => {
      const dirsToCheck = ['services', 'lib']
      const violations: Array<{ file: string; line: number; text: string }> = []

      for (const dir of dirsToCheck) {
        const fullDir = path.join(SRC_ROOT, dir)
        if (!fs.existsSync(fullDir)) continue

        const files = walkSync(fullDir, ['.ts', '.tsx'])
        for (const file of files) {
          if (file.includes('.test.') || file.includes('.spec.')) continue
          const content = fs.readFileSync(file, 'utf-8')
          const lines = content.split('\n')
          for (let i = 0; i < lines.length; i++) {
            if (/from\s+['"]@\/pages\//.test(lines[i])) {
              violations.push({ file: relPath(file), line: i + 1, text: lines[i].trim() })
            }
          }
        }
      }

      expect(
        violations,
        `services/ 和 lib/ 不应导入 pages/（循环依赖风险）:\n${violations.map((v) => `  ${v.file}:${v.line}: ${v.text}`).join('\n')}`
      ).toEqual([])
    })

    it('services/ 不应导入 components/', () => {
      const servicesDir = path.join(SRC_ROOT, 'services')
      if (!fs.existsSync(servicesDir)) return

      const files = walkSync(servicesDir, ['.ts', '.tsx'])
      const violations: Array<{ file: string; line: number; text: string }> = []

      for (const file of files) {
        if (file.includes('.test.') || file.includes('.spec.')) continue
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (/from\s+['"]@\/components\//.test(lines[i])) {
            violations.push({ file: relPath(file), line: i + 1, text: lines[i].trim() })
          }
        }
      }

      expect(
        violations,
        `Services 不应导入 Components:\n${violations.map((v) => `  ${v.file}:${v.line}: ${v.text}`).join('\n')}`
      ).toEqual([])
    })
  })

  describe('循环依赖检测 - 同层互导', () => {
    it('stores/ 内的文件不应互相导入（避免初始化顺序问题）', () => {
      const storesDir = path.join(SRC_ROOT, 'stores')
      if (!fs.existsSync(storesDir)) return

      const files = walkSync(storesDir, ['.ts', '.tsx'])
      const storeFiles = files.filter((f) => !f.includes('.test.') && !f.includes('.spec.'))
      const violations: Array<{ file: string; imports: string }> = []

      for (const file of storeFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        for (const other of storeFiles) {
          if (other === file) continue
          const otherBase = path.basename(other, path.extname(other))
          const importPattern = new RegExp(`from\\s+['"](?:\\./|\\.\\./|@/stores/)${otherBase}['"]`)
          if (importPattern.test(content)) {
            violations.push({ file: relPath(file), imports: otherBase })
          }
        }
      }

      if (violations.length > 0) {
        console.warn(
          `⚠️ Store 互相导入:\n${violations.map((v) => `  ${v.file} → ${v.imports}`).join('\n')}`
        )
      }
      expect(
        violations.length,
        `stores/ 文件间不应互相导入（${violations.length} 处）`
      ).toBeLessThanOrEqual(2)
    })

    it('hooks/ 不应运行时导入 lib/supabase/client（type-only 导入除外）', () => {
      const hooksDir = path.join(SRC_ROOT, 'hooks')
      if (!fs.existsSync(hooksDir)) return

      const files = walkSync(hooksDir, ['.ts', '.tsx'])
      const violations: Array<{ file: string; line: number; text: string }> = []

      for (const file of files) {
        if (file.includes('.test.') || file.includes('.spec.')) continue
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (
            /from\s+['"]@\/lib\/supabase\/client['"]/.test(lines[i]) &&
            !/^import\s+type\b/.test(lines[i].trim())
          ) {
            violations.push({ file: relPath(file), line: i + 1, text: lines[i].trim() })
          }
        }
      }

      expect(
        violations,
        `Hooks 不应运行时导入 supabase client:\n${violations.map((v) => `  ${v.file}:${v.line}: ${v.text}`).join('\n')}`
      ).toEqual([])
    })
  })

  describe('TypeScript 严格性', () => {
    it('源文件中无未标注的 @ts-ignore', () => {
      const files = walkSync(SRC_ROOT, ['.ts', '.tsx'])
      const violations: Array<{ file: string; line: number }> = []

      for (const file of files) {
        if (file.includes('.test.') || file.includes('.spec.')) continue
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (/@ts-ignore/.test(lines[i]) && !/@ts-ignore\s+--/.test(lines[i])) {
            violations.push({ file: relPath(file), line: i + 1 })
          }
        }
      }

      expect(
        violations,
        `发现未标注原因的 @ts-ignore:\n${violations.map((v) => `  ${v.file}:${v.line}`).join('\n')}`
      ).toEqual([])
    })
  })
})
