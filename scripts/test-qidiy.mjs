/**
 * 测试 qidiy 爬虫适配器
 * 使用 tsx 运行: npx tsx scripts/test-qidiy.mjs
 */
async function test() {
  console.log('🧪 测试 qidiy 爬虫适配器...\n')

  const { qidiyAdapter } = await import('../src/crawler/qidiyAdapter.ts')

  // 测试搜索
  console.log('📄 测试搜索...')
  try {
    console.log('搜索「仙」...')
    const results = await qidiyAdapter.search('仙')
    console.log(`搜索结果: ${results.length} 条`)
    results.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title} - ${r.author} [${r.category}]`)
      console.log(`     URL: ${r.bookUrl}`)
    })
  } catch (err) {
    console.error('❌ 搜索失败:', err.message)
  }

  // 测试章节列表
  console.log('\n📄 测试获取章节列表...')
  try {
    const chapters = await qidiyAdapter.getChapterList('/book/45394/')
    console.log(`章节数: ${chapters.length}`)
    chapters.slice(0, 5).forEach((c, i) => {
      console.log(`  ${c.index}. ${c.title} -> ${c.url}`)
    })
    // 显示最后5章
    if (chapters.length > 5) {
      console.log('  ...')
      chapters.slice(-5).forEach((c, i) => {
        console.log(`  ${c.index}. ${c.title} -> ${c.url}`)
      })
    }
  } catch (err) {
    console.error('❌ 获取章节列表失败:', err.message)
  }

  // 测试章节内容
  console.log('\n📄 测试获取章节内容...')
  try {
    const content = await qidiyAdapter.getChapterContent('/book/45394/28964000.html')
    console.log(`标题: ${content.title}`)
    console.log(`内容长度: ${content.content.length} 字符`)
    console.log(`内容预览: ${content.content.slice(0, 200)}...`)
  } catch (err) {
    console.error('❌ 获取章节内容失败:', err.message)
  }

  console.log('\n✅ 测试完成')
}

test()
