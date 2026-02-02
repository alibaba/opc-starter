/// <reference types="node" />
import '@testing-library/jest-dom'

// Polyfill Blob.arrayBuffer for jsdom
// jsdom 的 Blob/File 对象缺少 arrayBuffer 方法
if (typeof Blob.prototype.arrayBuffer !== 'function') {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(this)
    })
  }
}
