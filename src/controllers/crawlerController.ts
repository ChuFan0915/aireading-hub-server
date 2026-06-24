import type { Middleware } from 'koa'
import * as crawlerService from '../services/crawlerService.js'
import { success, badRequest, error } from '../utils/response.js'

/**
 * 爬虫控制器
 * 提供搜索、章节列表、章节内容的 HTTP 接口
 */

/** 获取可用小说源列表 */
export const getSources: Middleware = async (ctx) => {
  try {
    const sources = crawlerService.getSourceNames()
    ctx.body = success(sources, '获取源列表成功')
  } catch (err: any) {
    ctx.body = error(err.message || '获取源列表失败')
  }
}

/** 搜索小说 */
export const search: Middleware = async (ctx) => {
  try {
    const keyword = ctx.query.keyword as string
    const source = ctx.query.source as string | undefined

    if (!keyword || !keyword.trim()) {
      ctx.body = badRequest('请提供搜索关键词 (keyword)')
      return
    }

    const results = await crawlerService.searchBooks(keyword, source)
    ctx.body = success(results, `搜索到 ${results.length} 条结果`)
  } catch (err: any) {
    ctx.body = error(err.message || '搜索失败')
  }
}

/** 获取章节列表 */
export const getChapterList: Middleware = async (ctx) => {
  try {
    const bookUrl = ctx.query.url as string
    const source = ctx.query.source as string | undefined

    if (!bookUrl) {
      ctx.body = badRequest('请提供书籍 URL (url)')
      return
    }

    const chapters = await crawlerService.getChapterList(bookUrl, source)
    ctx.body = success(chapters, `获取到 ${chapters.length} 个章节`)
  } catch (err: any) {
    ctx.body = error(err.message || '获取章节列表失败')
  }
}

/** 获取章节内容 */
export const getChapterContent: Middleware = async (ctx) => {
  try {
    const chapterUrl = ctx.query.url as string
    const source = ctx.query.source as string | undefined

    if (!chapterUrl) {
      ctx.body = badRequest('请提供章节 URL (url)')
      return
    }

    const content = await crawlerService.getChapterContent(chapterUrl, source)
    ctx.body = success(content, '获取章节内容成功')
  } catch (err: any) {
    ctx.body = error(err.message || '获取章节内容失败')
  }
}
