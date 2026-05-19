/**
 * ════════════════════════════════════════════
 *  提示词库数据导入脚本
 *  数据源: freestylefly / anil-matcha (Markdown)
 *  功能: 抓取 → 解析 → 清洗 → 分类 → 去重(SHA256) → 写入SQLite
 *  用法: node scripts/import-prompts.cjs
 * ══════════════════════════════════════════
 */
const https = require('https')
const crypto = require('crypto')
const path = require('path')

// 动态导入 better-sqlite3 (ESM 兼容)
let db
async function initDB() {
  const Database = (await import('better-sqlite3')).default
  const dbPath = path.resolve(__dirname, '../data/turing.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  console.log(`[DB] 已连接: ${dbPath}`)
}

// ══════════════════════════════════════════
//  HTTP 工具
// ══════════════════════════════════════════
function fetchText(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location, timeout).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      let data = ''
      res.setEncoding('utf8')
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// ══════════════════════════════════════════
//  SHA256 哈希 (去重)
// ══════════════════════════════════════════
function sha256(text) {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex')
}

// ══════════════════════════════════════════
//  关键词自动分类
// ══════════════════════════════════════════
const CATEGORY_RULES = [
  { name: '人像摄影', name_en: 'Portrait', icon: '👤', keywords: ['portrait', 'person', 'face', 'headshot', 'woman', 'man', 'girl', 'boy', 'selfie', '人像', '人物', '肖像'] },
  { name: '海报设计', name_en: 'Poster', icon: '🎨', keywords: ['poster', 'flyer', 'banner', 'advertisement', '海报', '广告', '宣传'] },
  { name: '信息图', name_en: 'Infographic', icon: '📊', keywords: ['infographic', 'chart', 'diagram', 'data visualization', '信息图', '图表', '数据可视化'] },
  { name: '角色设计', name_en: 'Character', icon: '🦸', keywords: ['character', 'creature', 'monster', 'superhero', '角色', '生物', '怪物'] },
  { name: '游戏美术', name_en: 'Game Art', icon: '🎮', keywords: ['game', 'pixel', 'sprite', '游戏', '像素'] },
  { name: 'UI设计', name_en: 'UI Design', icon: '🖥️', keywords: ['ui', 'interface', 'dashboard', 'app design', 'web design', '界面', '仪表盘'] },
  { name: '插画艺术', name_en: 'Illustration', icon: '🖌️', keywords: ['illustration', 'artwork', 'drawing', 'painting', '插画', '绘画', '插图'] },
  { name: '排版设计', name_en: 'Typography', icon: '🔤', keywords: ['typography', 'text', 'letter', 'font', '排版', '字体', '文字'] },
  { name: '产品摄影', name_en: 'Product', icon: '📦', keywords: ['product', 'still life', '商品', '产品', '静物'] },
  { name: '风景摄影', name_en: 'Landscape', icon: '🏔️', keywords: ['landscape', 'scenery', 'nature', 'sunset', '风景', '自然', '日落'] },
  { name: 'Logo设计', name_en: 'Logo', icon: '⭕', keywords: ['logo', 'icon', 'brand', 'emblem', '标志', '图标'] },
  { name: '图像编辑', name_en: 'Image Edit', icon: '✂️', keywords: ['edit', 'inpaint', 'outpaint', 'remove', 'replace', '编辑', '修图', '擦除'] },
]

function classifyPrompt(title, promptText) {
  const combined = `${title} ${promptText}`.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (combined.includes(kw.toLowerCase())) {
        return rule.name
      }
    }
  }
  return '其他'
}

// ══════════════════════════════════════════
//  语言检测
// ══════════════════════════════════════════
function detectLanguage(text) {
  const zhCount = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const enCount = (text.match(/[a-zA-Z]/g) || []).length
  if (zhCount > enCount && zhCount > 5) return 'zh'
  if (enCount > zhCount && enCount > 5) return 'en'
  if (zhCount > 0 && enCount > 0) return 'mixed'
  return 'en'
}

// ══════════════════════════════════════════
//  解析器: freestylefly/awesome-gpt-image-2
//  格式: gallery.md 中结构化案例
// ══════════════════════════════════════════
function parseFreestylefly(md) {
  const prompts = []
  // 匹配模式: ### 标题 后面紧跟提示词块
  // 格式1: > Prompt: ... 或 **Prompt:** ...
  // 格式2: 代码块中的提示词
  const sections = md.split(/^### /m).slice(1)

  for (const section of sections) {
    const lines = section.split('\n')
    const title = lines[0].replace(/\*\*/g, '').trim()

    // 提取提示词内容
    let promptText = ''

    // 方式1: > Prompt: 行
    const promptLine = lines.find(l => /^>\s*Prompt/i.test(l) || /^\*\*Prompt/i.test(l))
    if (promptLine) {
      promptText = promptLine.replace(/^>\s*Prompt\s*:?\s*/i, '').replace(/^\*\*Prompt\*\*:\s*/i, '').trim()
    }

    // 方式2: 代码块
    if (!promptText) {
      const codeMatch = section.match(/```\s*\n([\s\S]*?)```/)
      if (codeMatch) {
        promptText = codeMatch[1].trim()
      }
    }

    // 方式3: "Prompt" 后的引用块
    if (!promptText) {
      const blockquoteMatch = section.match(/Prompt\s*:?\s*\n((?:>\s*.*\n?)+)/i)
      if (blockquoteMatch) {
        promptText = blockquoteMatch[1].replace(/^>\s?/gm, '').trim()
      }
    }

    if (promptText && promptText.length > 10) {
      prompts.push({
        title: title.substring(0, 200),
        prompt_text: promptText.substring(0, 5000),
        source: 'freestylefly',
      })
    }
  }

  return prompts
}

// ══════════════════════════════════════════
//  解析器: Anil-matcha/Awesome-GPT-Image-2-API-Prompts
//  格式: README 中按分类的提示词列表
// ══════════════════════════════════════════
function parseAnilMatcha(md) {
  const prompts = []
  // 按二级标题分分类
  const sections = md.split(/^## /m).slice(1)

  let currentCategory = ''
  for (const section of sections) {
    const lines = section.split('\n')
    const heading = lines[0].replace(/\*\*/g, '').trim()
    currentCategory = heading

    // 匹配表格行或列表项中的提示词
    // 表格格式: | Title | Prompt | Source |
    const tableRows = section.matchAll(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/gm)
    for (const row of tableRows) {
      const title = row[1].replace(/\*\*/g, '').trim()
      const promptText = row[2].trim()
      const sourceUrl = row[3].replace(/\[.*?\]\((.*?)\)/, '$1').trim()

      // 跳过表头
      if (title === 'Title' || title === 'Prompt' || title.startsWith('---')) continue

      if (promptText.length > 10) {
        prompts.push({
          title: title.substring(0, 200),
          prompt_text: promptText.substring(0, 5000),
          source: 'anil-matcha',
          source_url: sourceUrl,
          category_hint: currentCategory,
        })
      }
    }

    // 列表项格式: - **Title**: Prompt
    const listItems = section.matchAll(/^[-*]\s+\*\*(.+?)\*\*[:\s]+(.+)$/gm)
    for (const item of listItems) {
      const title = item[1].trim()
      const promptText = item[2].trim()

      if (promptText.length > 10) {
        prompts.push({
          title: title.substring(0, 200),
          prompt_text: promptText.substring(0, 5000),
          source: 'anil-matcha',
          category_hint: currentCategory,
        })
      }
    }

    // 代码块中的提示词
    const codeBlocks = section.matchAll(/```\s*\n([\s\S]*?)```/g)
    for (const block of codeBlocks) {
      const promptText = block[1].trim()
      if (promptText.length > 20) {
        // 尝试从代码块前的文字提取标题
        const beforeCode = section.substring(0, block.index)
        const lastHeading = beforeCode.match(/(?:^|\n)[-*]\s+\*\*(.+?)\*\*\s*$/m)
        const title = lastHeading ? lastHeading[1].trim() : promptText.substring(0, 80)

        prompts.push({
          title: title.substring(0, 200),
          prompt_text: promptText.substring(0, 5000),
          source: 'anil-matcha',
          category_hint: currentCategory,
        })
      }
    }
  }

  return prompts
}

// ══════════════════════════════════════════
//  确保分类存在
// ══════════════════════════════════════════
const categoryCache = new Map()

function ensureCategory(name) {
  if (categoryCache.has(name)) return categoryCache.get(name)

  const existing = db.prepare('SELECT id FROM prompt_categories WHERE name = ?').get(name)
  if (existing) {
    categoryCache.set(name, existing.id)
    return existing.id
  }

  const rule = CATEGORY_RULES.find(r => r.name === name) || { name_en: '', icon: '📌', sort_order: 99 }
  const result = db.prepare(
    'INSERT INTO prompt_categories (name, name_en, icon, sort_order) VALUES (?, ?, ?, ?)'
  ).run(name, rule.name_en || '', rule.icon || '📌', rule.sort_order || 99)

  categoryCache.set(name, result.lastInsertRowid)
  console.log(`  [分类] 新增: ${name} (ID: ${result.lastInsertRowid})`)
  return result.lastInsertRowid
}

// ══════════════════════════════════════════
//  数据清洗
// ══════════════════════════════════════════
function cleanPrompt(raw) {
  let text = raw.prompt_text

  // 移除 Markdown 图片语法
  text = text.replace(/!\[.*?\]\(.*?\)/g, '')
  // 移除 HTML 标签
  text = text.replace(/<[^>]+>/g, '')
  // 移除多余空白
  text = text.replace(/\n{3,}/g, '\n\n').trim()
  // 移除首尾引号
  text = text.replace(/^["'`]+|["'`]+$/g, '')

  return {
    ...raw,
    prompt_text: text,
    title: raw.title.replace(/!\[.*?\]\(.*?\)/g, '').replace(/<[^>]+>/g, '').trim(),
  }
}

// ══════════════════════════════════════════
//  主流程
// ══════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════')
  console.log(' 提示词库数据导入脚本')
  console.log('═══════════════════════════════════════════\n')

  await initDB()

  // ── 1. 抓取数据 ──
  const sources = [
    {
      name: 'freestylefly',
      urls: [
        'https://raw.githubusercontent.com/freestylefly/awesome-gpt-image-2/main/gallery.md',
        'https://raw.githubusercontent.com/freestylefly/awesome-gpt-image-2/main/README.md',
      ],
      parser: parseFreestylefly,
    },
    {
      name: 'anil-matcha',
      urls: [
        'https://raw.githubusercontent.com/Anil-matcha/Awesome-GPT-Image-2-API-Prompts/main/README.md',
      ],
      parser: parseAnilMatcha,
    },
  ]

  const allRaw = []

  for (const src of sources) {
    console.log(`\n[抓取] ${src.name} ...`)
    for (const url of src.urls) {
      try {
        const md = await fetchText(url)
        const parsed = src.parser(md)
        console.log(`  ✓ ${url.split('/').pop()}: 解析出 ${parsed.length} 条`)
        allRaw.push(...parsed)
      } catch (err) {
        console.warn(`  ✗ ${url}: ${err.message}`)
      }
    }
  }

  console.log(`\n[汇总] 原始数据: ${allRaw.length} 条`)

  // ── 2. 清洗 ──
  const cleaned = allRaw
    .map(cleanPrompt)
    .filter(p => p.prompt_text.length >= 15 && p.title.length >= 2)

  console.log(`[清洗] 有效数据: ${cleaned.length} 条`)

  // ── 3. 去重 + 分类 + 写入 ──
  const seen = new Set()
  let inserted = 0
  let duplicated = 0

  const insertStmt = db.prepare(`
    INSERT INTO prompt_library (category_id, title, prompt_text, prompt_hash, source, source_url, author, language, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      const hash = sha256(item.prompt_text)
      if (seen.has(hash)) { duplicated++; continue }
      seen.add(hash)

      // 分类
      const category = item.category_hint && item.category_hint !== '未分类'
        ? classifyPrompt(item.category_hint, '')
        : classifyPrompt(item.title, item.prompt_text)
      const categoryId = ensureCategory(category)

      // 语言检测
      const lang = detectLanguage(item.prompt_text)

      try {
        insertStmt.run(
          categoryId,
          item.title,
          item.prompt_text,
          hash,
          item.source || '',
          item.source_url || '',
          item.author || '',
          lang,
          item.tags || ''
        )
        inserted++
      } catch (err) {
        if (err.message.includes('UNIQUE')) {
          duplicated++
        } else {
          console.warn(`  [写入失败] "${item.title.substring(0, 30)}...": ${err.message}`)
        }
      }
    }
  })

  insertMany(cleaned)

  // ── 4. 更新分类计数 ──
  db.prepare(`
    UPDATE prompt_categories SET prompt_count = (
      SELECT COUNT(*) FROM prompt_library WHERE category_id = prompt_categories.id
    )
  `).run()

  // ── 5. 结果 ──
  const totalInDb = db.prepare('SELECT COUNT(*) as c FROM prompt_library').get().c
  const totalCats = db.prepare('SELECT COUNT(*) as c FROM prompt_categories').get().c

  console.log('\n═══════════════════════════════════════════')
  console.log(` 导入完成!`)
  console.log(`  新增: ${inserted} 条`)
  console.log(`  去重: ${duplicated} 条`)
  console.log(`  数据库总量: ${totalInDb} 条`)
  console.log(`  分类数: ${totalCats} 个`)
  console.log('═══════════════════════════════════════════\n')

  // 输出分类统计
  const cats = db.prepare('SELECT name, prompt_count FROM prompt_categories ORDER BY prompt_count DESC').all()
  console.log('分类统计:')
  for (const c of cats) {
    console.log(`  ${c.name}: ${c.prompt_count}`)
  }

  db.close()
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})