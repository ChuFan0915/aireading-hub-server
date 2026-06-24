import type { Middleware } from 'koa'
import * as bookshelfService from '../services/bookshelfService.js'
import { success, badRequest, error } from '../utils/response.js'

/**
 * 获取当前用户的书架列表
 * GET /api/bookshelf
 */
export const getBookshelf: Middleware = async (ctx) => {
  try {
    const userId = ctx.user?.userId
    if (!userId) {
      ctx.body = badRequest('用户未登录')
      return
    }

    const list = await bookshelfService.getBookshelf(userId)
    ctx.body = success(list, '获取书架成功')
  } catch (err) {
    console.error('获取书架失败:', err)
    ctx.body = error('获取书架失败')
  }
}

/**
 * 将书加入书架
 * POST /api/bookshelf/add
 * Body: { bookId: string }
 */
export const addToBookshelf: Middleware = async (ctx) => {
  try {
    const userId = ctx.user?.userId
    if (!userId) {
      ctx.body = badRequest('用户未登录')
      return
    }

    const { bookId } = ctx.request.body as { bookId: string }
    if (!bookId) {
      ctx.body = badRequest('缺少 bookId 参数')
      return
    }

    const result = await bookshelfService.addToBookshelf(userId, bookId)
    ctx.body = success(result, '已加入书架')
  } catch (err) {
    console.error('加入书架失败:', err)
    ctx.body = error('加入书架失败')
  }
}

/**
 * 从书架移除
 * DELETE /api/bookshelf/:bookId
 */
export const removeFromBookshelf: Middleware = async (ctx) => {
  try {
    const userId = ctx.user?.userId
    if (!userId) {
      ctx.body = badRequest('用户未登录')
      return
    }

    const { bookId } = ctx.params as { bookId: string }
    if (!bookId) {
      ctx.body = badRequest('缺少 bookId 参数')
      return
    }

    await bookshelfService.removeFromBookshelf(userId, bookId)
    ctx.body = success(null, '已从书架移除')
  } catch (err) {
    console.error('移除书架失败:', err)
    ctx.body = error('移除书架失败')
  }
}

/**
 * 更新阅读进度
 * PUT /api/bookshelf/:bookId/progress
 * Body: { chapterIndex: number }
 *
 * 前端在用户切换章节或离开阅读页时调用此接口上报进度。
 * chapterIndex 为当前阅读到的章节 index（从 1 开始）。
 */
export const updateProgress: Middleware = async (ctx) => {
  try {
    const userId = ctx.user?.userId
    if (!userId) {
      ctx.body = badRequest('用户未登录')
      return
    }

    const { bookId } = ctx.params as { bookId: string }
    if (!bookId) {
      ctx.body = badRequest('缺少 bookId 参数')
      return
    }

    const { chapterIndex } = ctx.request.body as { chapterIndex: number }
    if (chapterIndex === undefined || chapterIndex === null) {
      ctx.body = badRequest('缺少 chapterIndex 参数')
      return
    }

    const result = await bookshelfService.updateProgress(
      userId,
      bookId,
      chapterIndex,
    )
    if (!result) {
      ctx.body = badRequest('该书不在您的书架中，无法记录进度')
      return
    }

    ctx.body = success(result, '更新阅读进度成功')
  } catch (err) {
    console.error('更新阅读进度失败:', err)
    ctx.body = error('更新阅读进度失败')
  }
}
