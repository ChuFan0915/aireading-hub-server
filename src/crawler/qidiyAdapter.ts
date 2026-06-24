import { chromium, type Browser, type Page } from 'playwright'
import * as cheerio from 'cheerio'
import type { SourceAdapter } from './sourceAdapter.js'
import type { SearchResult, ChapterInfo, ChapterContent } from './types.js'

const BASE_URL = 'https://www.qidiy.com'

/**
 * qidiy.com 爬虫适配器
 *
 * 关键实现细节：
 * - 使用 Playwright headless Chromium 绕过 Cloudflare 防护
 * - 所有页面跳转使用 page.goto() + waitUntil: 'networkidle' + 60s 超时
 *   （实测 'domcontentloaded' 会导致 Cloudflare 挑战未完成就返回）
 * - 每个方法创建独立的浏览器实例，避免状态污染
 * - 使用 Cheerio 解析服务端渲染的 HTML
 */
export const qidiyAdapter: SourceAdapter = {
  sourceName: '启迪小说',

  async search(keyword: string): Promise<SearchResult[]> {
    const browser = await createBrowser()
    try {
      const page = await createPage(browser)
      await passCloudflare(page)

      const searchUrl = `${BASE_URL}/search.html?keyWord=${encodeURIComponent(keyword)}`
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 })

      const html = await page.content()
      return parseSearchResults(html)
    } finally {
      await browser.close()
    }
  },

  async getChapterList(bookUrl: string): Promise<ChapterInfo[]> {
    const browser = await createBrowser()
    try {
      const page = await createPage(browser)
      await passCloudflare(page)

      const url = bookUrl.startsWith('http') ? bookUrl : `${BASE_URL}${bookUrl}`
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })

      const html = await page.content()
      return parseChapterList(html)
    } finally {
      await browser.close()
    }
  },

  async getChapterContent(chapterUrl: string): Promise<ChapterContent> {
    const browser = await createBrowser()
    try {
      const page = await createPage(browser)
      await passCloudflare(page)

      const url = chapterUrl.startsWith('http') ? chapterUrl : `${BASE_URL}${chapterUrl}`
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })

      const html = await page.content()
      return parseChapterContent(html)
    } finally {
      await browser.close()
    }
  },
}

// ==================== 浏览器管理 ====================

async function createBrowser(): Promise<Browser> {
  return await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  })
}

async function createPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN',
  })
  return await context.newPage()
}

/** 访问首页，通过 Cloudflare 挑战 */
async function passCloudflare(page: Page): Promise<void> {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 })
}

// ==================== HTML 解析 ====================

/**
 * 解析搜索结果页
 *
 * HTML 结构：
 *   ul.txt-list.txt-list-row5
 *     li (表头)
 *     li
 *       span.s1 - 作品分类，如 "[武侠修真]"
 *       span.s2 - 作品名称，内含 <a href="/book/{id}/">
 *       span.s3 - 最新章节，内含 <a href="/book/{id}/{chapterId}.html">
 *       span.s4 - 作者
 *       span.s5 - 更新时间
 */
function parseSearchResults(html: string): SearchResult[] {
  const $ = cheerio.load(html)
  const results: SearchResult[] = []

  $('ul.txt-list.txt-list-row5 li').each((i, el) => {
    if (i === 0) return // 跳过表头

    const $el = $(el)
    const s1 = $el.find('.s1').text().trim()
    const s2link = $el.find('.s2 a')
    const title = s2link.text().trim()
    const bookUrl = s2link.attr('href') || ''
    const author = $el.find('.s4').text().trim()
    const category = s1.replace(/[\[\]]/g, '').trim()

    if (title && bookUrl) {
      results.push({
        title,
        author,
        cover: '', // 搜索结果页没有封面图
        bookUrl: bookUrl.startsWith('http') ? bookUrl : `${BASE_URL}${bookUrl}`,
        desc: '',
        category,
        status: '',
      })
    }
  })

  return results
}

/**
 * 解析书籍详情页的章节列表
 *
 * HTML 结构：
 *   .section-list
 *     a[href$=".html"] - 章节链接
 *
 * 书籍信息可通过 og: meta 标签获取：
 *   meta[property="og:novel:author"]    -> 作者
 *   meta[property="og:novel:status"]    -> 状态（完本/连载中）
 *   meta[property="og:novel:category"]  -> 分类
 *   meta[property="og:image"]           -> 封面图
 *   meta[property="og:description"]     -> 简介
 *   meta[property="og:novel:book_name"] -> 书名
 */
function parseChapterList(html: string): ChapterInfo[] {
  const $ = cheerio.load(html)
  const chapters: ChapterInfo[] = []

  // 章节列表在 .section-list 中
  $('.section-list a[href$=".html"]').each((index, el) => {
    const $el = $(el)
    const href = $el.attr('href') || ''
    const title = $el.text().trim()

    if (title && href) {
      chapters.push({
        title,
        index: index + 1,
        url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
      })
    }
  })

  return chapters
}

/**
 * 解析章节内容页
 *
 * HTML 结构：
 *   .title        - 章节标题
 *   #content / .content - 正文内容
 *
 * 注意：内容开头可能有 "read2();" 等脚本残留，需要清理
 */
function parseChapterContent(html: string): ChapterContent {
  const $ = cheerio.load(html)

  // 章节标题
  const title = $('.title').first().text().trim()

  // 正文内容
  let content = ''
  const contentSelectors = ['#content', '.content']

  for (const sel of contentSelectors) {
    const $el = $(sel)
    if ($el.length > 0) {
      content = $el.text().trim()
      if (content.length > 100) break
    }
  }

  // 清理内容：移除 "read2();" 等脚本残留和分页标记
  content = content
    .replace(/read\d+\(\);/g, '') // 移除 read2(); read3(); 等
    .replace(/\(第\d+\/\d+页\)/g, '') // 移除 (第1/2页) 等分页标记
    .trim()

  return { title, content }
}
