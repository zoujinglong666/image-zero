/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 数据库层 (better-sqlite3)
 *
 *  业务模块:
 *  1. 用户体系      - users / user_preferences / vip_subscriptions
 *  2. 图片业务      - history
 *  3. 提示词库      - prompt_categories / prompt_library
 *  4. 提示词互动    - prompt_interactions / prompt_favorites
 *  5. 社区 UGC      - user_prompts / community_reports
 *
 *  设计原则:
 *  - 每张表必须有明确的主键、索引、外键约束
 *  - 时间字段统一使用 unix timestamp (秒)
 *  - 枚举值字段使用 TEXT + 注释说明合法值
 *  - 种子数据在建表后自动插入
 * ════════════════════════════════════════════
 */
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import logger from '../utils/logger.js'

// 数据库文件路径
const DB_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve('data')
const DB_PATH = path.join(DB_DIR, 'turing.db')

// 确保 data 目录存在
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

// 创建/打开数据库
const db = new Database(DB_PATH)

// 启用 WAL 模式（提升并发读写性能）
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 5000')

// ══════════════════════════════════════════
//  建表语句 — 按业务模块组织
// ══════════════════════════════════════════

const CREATE_TABLES = `
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  模块一: 用户体系
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1.1 用户表
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  uid           TEXT    NOT NULL UNIQUE,                  -- JWT 中的 uid (openid SHA256 前12位)
  openid_hash   TEXT    UNIQUE,                           -- openid 完整 SHA256 (微信用户)
  type          TEXT    NOT NULL DEFAULT 'guest'          -- guest / wechat / anonymous
    CHECK(type IN ('guest', 'wechat', 'anonymous')),
  nickname      TEXT    DEFAULT '',
  avatar_url    TEXT    DEFAULT '',
  vip_level     INTEGER NOT NULL DEFAULT 0,               -- 0=免费 1=基础 2=专业 3=旗舰
  vip_expire_at INTEGER DEFAULT 0,                        -- VIP 到期时间 (unix timestamp, 秒)
  daily_quota   INTEGER NOT NULL DEFAULT 10,              -- 每日免费额度
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_users_uid         ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_openid_hash ON users(openid_hash);
CREATE INDEX IF NOT EXISTS idx_users_type        ON users(type);

-- 1.2 用户偏好表 (key-value 灵活结构)
-- 常用 pref_key: theme / language / quality / size / model
CREATE TABLE IF NOT EXISTS user_preferences (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  pref_key   TEXT    NOT NULL,
  pref_value TEXT    NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, pref_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prefs_user_key ON user_preferences(user_id, pref_key);

-- 1.3 VIP 订阅表 (预留，暂无业务逻辑使用)
CREATE TABLE IF NOT EXISTS vip_subscriptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  plan          TEXT    NOT NULL DEFAULT 'basic'          -- basic / pro / ultimate
    CHECK(plan IN ('basic', 'pro', 'ultimate')),
  status        TEXT    NOT NULL DEFAULT 'active'         -- active / expired / cancelled
    CHECK(status IN ('active', 'expired', 'cancelled')),
  started_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  expire_at     INTEGER NOT NULL,
  payment_no    TEXT    DEFAULT '',
  amount_cents  INTEGER DEFAULT 0,                         -- 金额 (分)
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vip_user_id    ON vip_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_status     ON vip_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_vip_expire_at  ON vip_subscriptions(expire_at);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  模块二: 图片业务
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 2.1 历史记录表 (图片分析/生成/编辑)
CREATE TABLE IF NOT EXISTS history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL DEFAULT 0,               -- 0 = 游客/未登录
  type          TEXT    NOT NULL DEFAULT 'analyze'        -- analyze / edit / generate
    CHECK(type IN ('analyze', 'edit', 'generate')),
  image_url     TEXT    DEFAULT '',                        -- 原图 URL/base64 (缩略)
  prompt_cn     TEXT    DEFAULT '',                        -- 中文提示词
  prompt_en     TEXT    DEFAULT '',                        -- 英文提示词
  style         TEXT    DEFAULT '',                        -- 风格
  result_json   TEXT    DEFAULT '',                        -- 完整分析结果 JSON
  generated_url TEXT    DEFAULT '',                        -- 生成的图片 URL
  favorite      INTEGER NOT NULL DEFAULT 0                -- 0=未收藏 1=已收藏
    CHECK(favorite IN (0, 1)),
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_user_id    ON history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_type       ON history(type);
CREATE INDEX IF NOT EXISTS idx_history_favorite   ON history(user_id, favorite);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(user_id, created_at DESC);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  模块三: 提示词库 (官方精选)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 3.1 提示词分类表
CREATE TABLE IF NOT EXISTS prompt_categories (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL UNIQUE,                   -- 分类名 (中文): 人像摄影 / 海报设计 等
  name_en      TEXT    DEFAULT '',                        -- 英文名: Portrait / Poster 等
  icon         TEXT    DEFAULT '',                        -- 分类图标 (emoji)
  sort_order   INTEGER NOT NULL DEFAULT 0,                -- 排序权重 (越小越靠前)
  prompt_count INTEGER NOT NULL DEFAULT 0,                -- 提示词数量 (缓存，由脚本更新)
  created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_cat_name ON prompt_categories(name);

-- 3.2 提示词库表 (官方精选，来自开源仓库导入)
CREATE TABLE IF NOT EXISTS prompt_library (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id    INTEGER NOT NULL DEFAULT 0,
  title          TEXT    NOT NULL,                         -- 标题/简短描述
  prompt_text    TEXT    NOT NULL,                         -- 完整提示词内容
  prompt_hash    TEXT    NOT NULL UNIQUE,                  -- SHA256 去重哈希
  source         TEXT    DEFAULT '',                       -- 来源仓库: freestylefly / anil-matcha
  source_url     TEXT    DEFAULT '',                       -- 原始链接
  author         TEXT    DEFAULT '',                       -- 原始作者
  language       TEXT    DEFAULT 'zh'                      -- zh / en / ja / mixed
    CHECK(language IN ('zh', 'en', 'ja', 'mixed')),
  is_template    INTEGER NOT NULL DEFAULT 0               -- 0=普通 1=含参数模板
    CHECK(is_template IN (0, 1)),
  tags           TEXT    DEFAULT '',                       -- 逗号分隔标签
  view_count     INTEGER NOT NULL DEFAULT 0,
  like_count     INTEGER NOT NULL DEFAULT 0,
  copy_count     INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (category_id) REFERENCES prompt_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_cat_id    ON prompt_library(category_id);
CREATE INDEX IF NOT EXISTS idx_prompt_hash      ON prompt_library(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_prompt_source    ON prompt_library(source);
CREATE INDEX IF NOT EXISTS idx_prompt_lang      ON prompt_library(language);
CREATE INDEX IF NOT EXISTS idx_prompt_views     ON prompt_library(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_likes     ON prompt_library(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_created   ON prompt_library(created_at DESC);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  模块四: 提示词互动
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 4.1 提示词互动表 (浏览/点赞/复制)
-- target_type: library=官方库提示词, community=社区UGC提示词
-- prompt_id 根据 target_type 指向不同表的主键
CREATE TABLE IF NOT EXISTS prompt_interactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL DEFAULT 0,
  prompt_id     INTEGER NOT NULL,
  target_type   TEXT    NOT NULL DEFAULT 'library'        -- library / community
    CHECK(target_type IN ('library', 'community')),
  action        TEXT    NOT NULL                          -- view / like / copy / community_like
    CHECK(action IN ('view', 'like', 'copy', 'community_like')),
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, prompt_id, target_type, action)
);

CREATE INDEX IF NOT EXISTS idx_interact_user       ON prompt_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interact_prompt     ON prompt_interactions(prompt_id, target_type);
CREATE INDEX IF NOT EXISTS idx_interact_user_action ON prompt_interactions(user_id, prompt_id, target_type, action);

-- 4.2 提示词收藏表 (仅官方库)
CREATE TABLE IF NOT EXISTS prompt_favorites (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  prompt_id     INTEGER NOT NULL,
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, prompt_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (prompt_id) REFERENCES prompt_library(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fav_user   ON prompt_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_prompt ON prompt_favorites(prompt_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  模块五: 社区 UGC
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 5.1 用户自创提示词表（含社区分享）
CREATE TABLE IF NOT EXISTS user_prompts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  title         TEXT    NOT NULL,
  prompt_text   TEXT    NOT NULL,
  category_id   INTEGER DEFAULT 0,
  tags          TEXT    DEFAULT '',                       -- 逗号分隔标签
  is_public     INTEGER NOT NULL DEFAULT 0               -- 0=私密 1=公开(社区可见)
    CHECK(is_public IN (0, 1)),
  image_url     TEXT    DEFAULT '',                       -- 示例图片 URL (COS)
  image_hash    TEXT    DEFAULT '',                       -- 图片指纹(去重/校验, SHA256前32位)
  view_count    INTEGER NOT NULL DEFAULT 0,
  like_count    INTEGER NOT NULL DEFAULT 0,
  copy_count    INTEGER NOT NULL DEFAULT 0,               -- 复制次数
  status        TEXT    NOT NULL DEFAULT 'published'      -- published / pending_review / hidden / reported
    CHECK(status IN ('published', 'pending_review', 'hidden', 'reported')),
  report_count  INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES prompt_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_user_prompts_uid     ON user_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prompts_pub     ON user_prompts(is_public, status);
CREATE INDEX IF NOT EXISTS idx_user_prompts_likes    ON user_prompts(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_prompts_hash     ON user_prompts(image_hash);
CREATE INDEX IF NOT EXISTS idx_user_prompts_updated  ON user_prompts(user_id, updated_at DESC);

-- 5.2 社区举报表
CREATE TABLE IF NOT EXISTS community_reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id     INTEGER NOT NULL,
  reporter_id   INTEGER NOT NULL,
  reason        TEXT    NOT NULL DEFAULT ''               -- spam / inappropriate / copyright / other
    CHECK(reason IN ('spam', 'inappropriate', 'copyright', 'other')),
  description   TEXT    DEFAULT '',
  status        TEXT    NOT NULL DEFAULT 'pending'        -- pending / resolved / dismissed
    CHECK(status IN ('pending', 'resolved', 'dismissed')),
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (prompt_id) REFERENCES user_prompts(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reports_prompt   ON community_reports(prompt_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON community_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON community_reports(status);
`

// ══════════════════════════════════════════
//  兼容迁移: 为已存在的数据库添加新列
// ══════════════════════════════════════════
function runMigrations() {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
  const tableNames = tables.map(t => t.name)

  // ── user_prompts 新增字段 ──
  if (tableNames.includes('user_prompts')) {
    const cols = db.prepare('PRAGMA table_info(user_prompts)').all().map(c => c.name)
    const newColumns = [
      { name: 'tags',        sql: "ALTER TABLE user_prompts ADD COLUMN tags TEXT DEFAULT ''" },
      { name: 'image_url',   sql: "ALTER TABLE user_prompts ADD COLUMN image_url TEXT DEFAULT ''" },
      { name: 'image_hash',  sql: "ALTER TABLE user_prompts ADD COLUMN image_hash TEXT DEFAULT ''" },
      { name: 'view_count',  sql: "ALTER TABLE user_prompts ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0" },
      { name: 'like_count',  sql: "ALTER TABLE user_prompts ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0" },
      { name: 'copy_count',  sql: "ALTER TABLE user_prompts ADD COLUMN copy_count INTEGER NOT NULL DEFAULT 0" },
      { name: 'status',      sql: "ALTER TABLE user_prompts ADD COLUMN status TEXT NOT NULL DEFAULT 'published'" },
      { name: 'report_count', sql: "ALTER TABLE user_prompts ADD COLUMN report_count INTEGER NOT NULL DEFAULT 0" },
    ]
    for (const col of newColumns) {
      if (!cols.includes(col.name)) {
        try {
          db.exec(col.sql)
          logger.info(`[DB Migration] 添加列 user_prompts.${col.name}`)
        } catch {
          // 列可能已存在，忽略
        }
      }
    }
  }

  // ── prompt_interactions 新增 target_type 字段 ──
  if (tableNames.includes('prompt_interactions')) {
    const cols = db.prepare('PRAGMA table_info(prompt_interactions)').all().map(c => c.name)
    if (!cols.includes('target_type')) {
      try {
        db.exec("ALTER TABLE prompt_interactions ADD COLUMN target_type TEXT NOT NULL DEFAULT 'library'")
        logger.info('[DB Migration] 添加列 prompt_interactions.target_type')
        // 迁移已有 community_like 数据
        db.exec("UPDATE prompt_interactions SET target_type = 'community' WHERE action = 'community_like'")
        logger.info('[DB Migration] 迁移 community_like 数据: target_type → community')
      } catch {
        // 列可能已存在，忽略
      }
    }
  }
}

// 执行迁移（在建表前，针对已存在的旧库）
runMigrations()

// 执行建表
db.exec(CREATE_TABLES)

// ══════════════════════════════════════════
//  种子数据: 默认提示词分类
// ══════════════════════════════════════════
function seedCategories() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM prompt_categories').get().c
  if (count > 0) return // 已有数据则跳过

  const DEFAULT_CATEGORIES = [
    { name: '人像摄影', name_en: 'Portrait',     icon: '👤', sort_order: 1 },
    { name: '海报设计', name_en: 'Poster',        icon: '🎨', sort_order: 2 },
    { name: '信息图',   name_en: 'Infographic',   icon: '📊', sort_order: 3 },
    { name: '角色设计', name_en: 'Character',     icon: '🦸', sort_order: 4 },
    { name: '游戏美术', name_en: 'Game Art',      icon: '🎮', sort_order: 5 },
    { name: 'UI设计',   name_en: 'UI Design',     icon: '🖥️', sort_order: 6 },
    { name: '插画艺术', name_en: 'Illustration',   icon: '🖌️', sort_order: 7 },
    { name: '排版设计', name_en: 'Typography',     icon: '🔤', sort_order: 8 },
    { name: '产品摄影', name_en: 'Product',        icon: '📦', sort_order: 9 },
    { name: '风景摄影', name_en: 'Landscape',      icon: '🏔️', sort_order: 10 },
    { name: 'Logo设计', name_en: 'Logo',           icon: '⭕', sort_order: 11 },
    { name: '图像编辑', name_en: 'Image Edit',     icon: '✂️', sort_order: 12 },
  ]

  const insert = db.prepare(
    'INSERT INTO prompt_categories (name, name_en, icon, sort_order) VALUES (?, ?, ?, ?)'
  )
  const batch = db.transaction((items) => {
    for (const item of items) {
      insert.run(item.name, item.name_en, item.icon, item.sort_order)
    }
  })
  batch(DEFAULT_CATEGORIES)
  logger.info(`[DB Seed] 插入 ${DEFAULT_CATEGORIES.length} 条默认分类`)
}

seedCategories()

logger.info(`[DB] 数据库初始化完成: ${DB_PATH}`)

export default db
