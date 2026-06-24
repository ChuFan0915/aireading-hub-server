/**
 * 测试爬虫 API
 * 启动服务器后运行: npx tsx scripts/test-api.mjs
 */
async function test() {
  const BASE = 'http://localhost:3000'
  
  async function get(path) {
    const resp = await fetch(`${BASE}${path}`)
    return await resp.json()
  }

  console.log('🧪 测试爬虫 API...\n')

  // 1. 健康检查
  console.log('1️⃣ 健康检查')
  const health = await get('/health')
  console.log(`   ${health.message} (${health.code})`)
  console.log()

  // 2. 获取源列表
  console.log('2️⃣ 获取源列表')
  const sources = await get('/api/crawler/sources')
  console.log(`   ${sources.message}: ${sources.data?.join(', ')}`)
  console.log()

  // 3. 搜索
  console.log('3️⃣ 搜索小说「仙」')
  console.log('   ⏳ 正在搜索（可能需要 30-60 秒）...')
  const search = await get('/api/crawler/search?keyword=仙')
  console.log(`   ${search.message}`)
  if (search.data) {
    search.data.slice(0, 5).forEach((r, i) => {
      console.log(`   ${i+1}. 《${r.title}》 - ${r.author} [${r.category}]`)
    })
  }
  console.log()

  // 4. 获取章节列表
  console.log('4️⃣ 获取章节列表')
  console.log('   ⏳ 正在获取（可能需要 30-60 秒）...')
  const chapters = await get('/api/crawler/chapters?url=/book/45394/')
  console.log(`   ${chapters.message}`)
  if (chapters.data) {
    chapters.data.slice(0, 3).forEach(c => {
      console.log(`   ${c.index}. ${c.title}`)
    })
    console.log(`   ... 共 ${chapters.data.length} 章`)
  }
  console.log()

  // 5. 获取章节内容
  console.log('5️⃣ 获取章节内容')
  console.log('   ⏳ 正在获取（可能需要 30-60 秒）...')
  const content = await get('/api/crawler/content?url=/book/45394/28964000.html')
  console.log(`   ${content.message}`)
  if (content.data) {
    console.log(`   标题: ${content.data.title}`)
    console.log(`   内容长度: ${content.data.content?.length || 0} 字符`)
    console.log(`   预览: ${content.data.content?.slice(0, 100)}...`)
  }
}

test().catch(err => console.error('❌ 测试失败:', err.message))
