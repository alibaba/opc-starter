import '@testing-library/jest-dom'
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer'

// 替换 jsdom 的 Blob/File 为 Node.js 原生版本（支持 arrayBuffer）
// @ts-expect-error - 替换全局 Blob
globalThis.Blob = NodeBlob
// @ts-expect-error - 替换全局 File
globalThis.File = NodeFile
