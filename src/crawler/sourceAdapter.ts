import type { SearchResult, ChapterInfo, ChapterContent } from './types.js'

export interface SourceAdapter {
  readonly sourceName: string
  search(keyword: string): Promise<SearchResult[]>
  getChapterList(bookUrl: string): Promise<ChapterInfo[]>
  getChapterContent(chapterUrl: string): Promise<ChapterContent>
}