import type { Middleware } from 'koa'
import * as bookService from '../services/bookService.js'
import { success, notFound, badRequest, error } from '../utils/response.js'

/**
 * 获取书籍详情（含章节列表）
 * GET /api/books/:bookId
 */
export const getBookDetail: Middleware = async (ctx) => {
  try {
    const { bookId } = ctx.params as { bookId: string }
    if (!bookId) {
      ctx.body = badRequest('缺少 bookId 参数')
      return
    }

    const book = await bookService.getBookDetail(bookId)
    if (!book) {
      ctx.body = notFound('书籍不存在')
      return
    }

    ctx.body = success(book, '获取书籍详情成功')
  } catch (err) {
    console.error('获取书籍详情失败:', err)
    ctx.body = error('获取书籍详情失败')
  }
}

/**
 * 获取章节内容
 * GET /api/books/:bookId/chapters/:chapterId
 */
export const getChapterContent: Middleware = async (ctx) => {
  try {
    const { chapterId } = ctx.params as { chapterId: string }
    if (!chapterId) {
      ctx.body = badRequest('缺少 chapterId 参数')
      return
    }

    const chapter = await bookService.getChapterContent(chapterId)
    if (!chapter) {
      ctx.body = notFound('章节不存在')
      return
    }

    ctx.body = success(chapter, '获取章节内容成功')
  } catch (err) {
    console.error('获取章节内容失败:', err)
    ctx.body = error('获取章节内容失败')
  }
}

/**
 * 获取书籍完整阅读数据（所有章节内容 + 书架进度）
 * GET /api/books/:bookId/read
 *
 * 返回书籍所有章节的完整内容，以及书架上的阅读进度（lastReadIndex）。
 * 前端根据 lastReadIndex 决定从哪一章开始渲染：
 *   - lastReadIndex === 0 → 从头开始
 *   - lastReadIndex > 0  → 跳转到该章节
 */
export const getBookReadData: Middleware = async (ctx) => {
  try {
    const { bookId } = ctx.params as { bookId: string }
    if (!bookId) {
      ctx.body = badRequest('缺少 bookId 参数')
      return
    }

    const userId = ctx.user?.userId

    const data = await bookService.getBookReadData(bookId, userId)
    if (!data) {
      ctx.body = notFound('书籍不存在')
      return
    }

    ctx.body = success(data, '获取书籍阅读数据成功')
  } catch (err) {
    console.error('获取书籍阅读数据失败:', err)
    ctx.body = error('获取书籍阅读数据失败')
  }
}
