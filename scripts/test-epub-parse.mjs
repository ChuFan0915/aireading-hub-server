import AdmZip from 'adm-zip'
import { Parser } from 'xml2js'
import * as path from 'path'
import * as fs from 'fs/promises'

const filePath = process.argv[2]
if (!filePath) {
  console.error('请提供 EPUB 文件路径')
  process.exit(1)
}

async function parseXmlPromise(xml) {
  const parser = new Parser()
  return new Promise((resolve, reject) => {
    parser.parseString(xml, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

async function main() {
  console.log('=== 开始解析 EPUB ===')
  console.log('文件路径:', filePath)
  
  const zip = new AdmZip(filePath)
  const zipEntries = zip.getEntries()
  
  console.log('\n=== ZIP 中的所有文件 ===')
  zipEntries.forEach(e => console.log(`  ${e.entryName}`))
  
  // 1. 找 container.xml
  const containerEntry = zipEntries.find(e => e.entryName === 'META-INF/container.xml')
  if (!containerEntry) {
    console.error('找不到 META-INF/container.xml')
    return
  }
  
  const containerXml = containerEntry.getData().toString('utf-8')
  console.log('\n=== container.xml ===')
  console.log(containerXml)
  
  const containerParsed = await parseXmlPromise(containerXml)
  console.log('\n=== container.xml 解析结果 ===')
  console.log(JSON.stringify(containerParsed, null, 2))
  
  const rootfilePath = containerParsed.container?.rootfiles?.[0]?.rootfile?.[0]?.$?.['full-path']
  console.log('\n=== OPF 文件路径 ===')
  console.log(rootfilePath)
  
  // 2. 找 OPF 文件
  const opfEntry = zipEntries.find(e => e.entryName === rootfilePath || e.entryName.endsWith('/' + rootfilePath))
  if (!opfEntry) {
    console.error('找不到 OPF 文件:', rootfilePath)
    return
  }
  
  const opfXml = opfEntry.getData().toString('utf-8')
  console.log('\n=== OPF 内容 ===')
  console.log(opfXml)
  
  const opfParsed = await parseXmlPromise(opfXml)
  console.log('\n=== OPF 解析结果 ===')
  console.log(JSON.stringify(opfParsed, null, 2))
  
  const opfDir = path.dirname(rootfilePath)
  console.log('\n=== OPF 目录 ===')
  console.log(opfDir)
  
  // 3. 提取元数据
  const metadata = opfParsed.package?.metadata?.[0] || {}
  console.log('\n=== 元数据 ===')
  console.log(JSON.stringify(metadata, null, 2))
  
  // 4. 获取 spine
  const spine = opfParsed.package?.spine?.[0]
  console.log('\n=== spine ===')
  console.log(JSON.stringify(spine, null, 2))
  
  const spineItems = []
  if (spine?.itemref) {
    for (const ref of spine.itemref) {
      const idref = ref.$?.idref
      if (idref) spineItems.push(idref)
    }
  }
  console.log('\n=== spine itemrefs ===')
  console.log(spineItems)
  
  // 5. 获取 manifest
  const manifest = opfParsed.package?.manifest?.[0]
  console.log('\n=== manifest ===')
  console.log(JSON.stringify(manifest, null, 2))
  
  const idToHref = {}
  if (manifest?.item) {
    for (const item of manifest.item) {
      const id = item.$.id
      const href = item.$.href
      if (id && href) {
        idToHref[id] = href
      }
    }
  }
  console.log('\n=== id → href 映射 ===')
  console.log(JSON.stringify(idToHref, null, 2))
  
  // 6. 读取章节
  console.log('\n=== 读取章节 ===')
  for (const idref of spineItems) {
    const href = idToHref[idref]
    if (!href) {
      console.log(`  ${idref}: 找不到 href`)
      continue
    }
    
    const fullPath = opfDir ? `${opfDir}/${href}` : href
    console.log(`  ${idref} → href=${href} → fullPath=${fullPath}`)
    
    const entry = zipEntries.find(e => e.entryName === fullPath || e.entryName.endsWith('/' + href))
    if (!entry) {
      console.log(`  ${idref}: 在 ZIP 中找不到文件`)
      continue
    }
    
    const htmlContent = entry.getData().toString('utf-8')
    console.log(`  ${idref}: 内容长度=${htmlContent.length} 字节`)
    console.log(`  前200字符: ${htmlContent.substring(0, 200)}`)
  }
}

main().catch(console.error)
