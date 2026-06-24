import type { SourceAdapter } from '../crawler/sourceAdapter.js'
import type { SearchResult, ChapterInfo, ChapterContent } from '../crawler/types.js'
import { qidiyAdapter } from '../crawler/qidiyAdapter.js'

/**
 * 爬虫服务
 *
 * 管理多个小说源的适配器，提供统一的搜索、章节列表、章节内容接口。
 * 后续添加新源时，只需在 sources 注册表中新增适配器即可。
 */

// 源注册表 — 按 sourceName 索引
const sources: Record<string, SourceAdapter> = {
  [qidiyAdapter.sourceName]: qidiyAdapter,
}

/** 获取所有可用源名称 */
export function getSourceNames(): string[] {
  return Object.keys(sources)
}

/** 根据名称获取源适配器 */
function getSource(sourceName?: string): SourceAdapter {
  if (sourceName) {
    const adapter = sources[sourceName]
    if (!adapter) {
      throw new Error(`未知的小说源: ${sourceName}，可用源: ${Object.keys(sources).join(', ')}`)
    }
    return adapter
  }
  // 默认使用第一个源
  return Object.values(sources)[0]
}

/**
 * 搜索小说
 * @param keyword 搜索关键词
 * @param sourceName 可选，小说源名称，不传则使用默认源
 */
export async function searchBooks(
  keyword: string,
  sourceName?: string,
): Promise<SearchResult[]> {
  if (!keyword || !keyword.trim()) {
    throw new Error('搜索关键词不能为空')
  }
  const adapter = getSource(sourceName)
  return await adapter.search(keyword.trim())
}

/**
 * 获取章节列表
 * @param bookUrl 书籍详情页 URL
 * @param sourceName 可选，小说源名称
 */
export async function getChapterList(
  bookUrl: string,
  sourceName?: string,
): Promise<ChapterInfo[]> {
  if (!bookUrl) {
    throw new Error('书籍 URL 不能为空')
  }
  const adapter = getSource(sourceName)
  return await adapter.getChapterList(bookUrl)
}

/**
 * 获取章节内容
 * @param chapterUrl 章节页 URL
 * @param sourceName 可选，小说源名称
 */
export async function getChapterContent(
  chapterUrl: string,
  sourceName?: string,
): Promise<ChapterContent> {
  if (!chapterUrl) {
    throw new Error('章节 URL 不能为空')
  }
  const adapter = getSource(sourceName)
  return await adapter.getChapterContent(chapterUrl)
}
