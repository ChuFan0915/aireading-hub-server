/**
 * 测试上传 API
 * 先启动服务器: npx tsx src/app.ts
 * 再运行: node scripts/test-upload.mjs
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = 'http://localhost:3000'

// 创建一个测试用的 TXT 文件
function createTestTxt() {
  const content = `书名：测试小说
作者：测试作者

第一章 初入江湖
江湖远，风萧萧。
一位少年背着一把长剑，走在茫茫大雪之中。
这是他第一次离开师门，心中既有期待，也有忐忑。

第二章 偶遇
少年在镇上遇到了一位神秘的老人。
老人说："你手中的剑，不是凡品。"
少年疑惑地看着手中的剑，不明白老人话中的含义。

第三章 真相
原来，这把剑是上古神兵，名为"霜寒"。
少年终于明白了自己的使命。
他要找到剑中隐藏的秘密，拯救这个即将陷入混乱的江湖。

第四章 决战
最终之战，天地变色。
少年手持霜寒剑，与黑暗势力展开了惊天动地的对决。
剑光闪过，黑暗退散。
江湖，终于恢复了平静。

尾声
多年后，少年已成为一代大侠。
他坐在山顶，看着远方的落日，回想着这一生的经历。
江湖，永远都在。`
  
  const filePath = path.join(__dirname, 'test-novel.txt')
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

async function test() {
  console.log('🧪 测试上传 API...\n')

  // 1. 注册用户
  const testUser = `test_${Date.now()}`
  console.log('1️⃣ 注册用户...')
  const registerResp = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username: testUser, 
      password: 'test123456',
      confirmPassword: 'test123456',
    }),
  })
  const registerData = await registerResp.json()
  console.log(`   注册结果:`, JSON.stringify(registerData, null, 2).slice(0, 300))
  
  let token = registerData?.data?.token
  if (!token) {
    // 尝试登录
    console.log('\n  尝试登录...')
    const loginResp = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUser, password: 'test123456' }),
    })
    const loginData = await loginResp.json()
    console.log(`   登录结果:`, JSON.stringify(loginData, null, 2).slice(0, 300))
    token = loginData?.data?.token
  }

  if (!token) {
    console.log('   ❌ 获取 token 失败')
    return
  }
  console.log(`   token: ${token.slice(0, 40)}...`)

  // 2. 上传 TXT 文件
  console.log('\n2️⃣ 上传 TXT 文件...')
  const testFile = createTestTxt()
  console.log(`   测试文件: ${testFile}`)
  
  // 使用 Node.js 内置方式构建 multipart 请求
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
  const fileContent = fs.readFileSync(testFile)
  
  let body = ''
  body += `--${boundary}\r\n`
  body += `Content-Disposition: form-data; name="file"; filename="测试小说.txt"\r\n`
  body += `Content-Type: text/plain\r\n\r\n`
  body += fileContent.toString('utf-8')
  body += `\r\n--${boundary}--\r\n`

  const uploadResp = await fetch(`${BASE}/api/upload/book`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  })
  const uploadData = await uploadResp.json()
  console.log(`   上传结果: ${uploadData.message}`)
  if (uploadData.data) {
    console.log(`   书名: ${uploadData.data.bookName}`)
    console.log(`   作者: ${uploadData.data.author}`)
    console.log(`   章节数: ${uploadData.data.chapterCount}`)
    console.log(`   bookId: ${uploadData.data.bookId}`)
  } else {
    console.log(`   完整响应:`, JSON.stringify(uploadData, null, 2))
  }

  // 清理测试文件
  fs.unlinkSync(testFile)

  console.log('\n✅ 测试完成')
}

test().catch(err => console.error('❌ 测试失败:', err.message))
