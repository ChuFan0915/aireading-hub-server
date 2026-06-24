import type { Middleware } from 'koa'
import * as uploadService from '../services/uploadService.js'
import { success, badRequest, error } from '../utils/response.js'
import * as path from 'path'
import * as fs from 'fs/promises'
import crypto from 'crypto'

// 上传文件存储目录
const UPLOAD_DIR = path.resolve('uploads')

/** 确保上传目录存在 */
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  } catch {
    // 目录已存在
  }
}

/**
 * 上传并解析小说文件
 * POST /api/upload/book
 * Content-Type: multipart/form-data
 * 字段: file (支持 .txt 或 .epub)
 */
export const uploadBook: Middleware = async (ctx) => {
  try {
    await ensureUploadDir()

    const file = (ctx.request as any).files?.file
    if (!file) {
      ctx.body = badRequest('请上传文件 (字段名: file)')
      return
    }

    const originalName = file.originalFilename || file.name || 'unknown'
    const ext = path.extname(originalName).toLowerCase()

    if (ext !== '.txt' && ext !== '.epub') {
      ctx.body = badRequest('仅支持 .txt 和 .epub 格式的文件')
      return
    }

    // 保存文件到临时目录
    const savedName = `${crypto.randomUUID()}${ext}`
    const savedPath = path.join(UPLOAD_DIR, savedName)

    // koa-body 保存的文件可能有 filepath 属性
    const sourcePath = file.filepath || file.path
    if (sourcePath) {
      await fs.copyFile(sourcePath, savedPath)
    } else {
      // 如果文件内容在 buffer 中
      await fs.writeFile(savedPath, file.buffer || file.data)
    }

    // 解析文件，并自动加入当前用户的书架
    const userId = ctx.user?.userId
    const result = await uploadService.uploadBook(savedPath, originalName, userId)

    // 清理临时文件
    await fs.unlink(savedPath).catch(() => {})

    ctx.body = success(result, `《${result.bookName}》上传成功，共 ${result.chapterCount} 章`)
  } catch (err: any) {
    console.error('上传书籍失败:', err)
    ctx.body = error(err.message || '上传失败')
  }
}
