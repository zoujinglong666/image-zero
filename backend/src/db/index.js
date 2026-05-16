/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 数据库层 (better-sqlite3)
 *  表结构设计: 用户 / 历史记录 / 用户偏好 / VIP / 提示词库
 *  设计原则: 后期好维护 · VIP 预留 · 索引合理
 * ══════════════════════════════════════════
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
//  建表语句
// ══════════════════════════════════════════

const CREATE_TABLES = `
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  用户表
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  uid           TEXT    NOT NULL UNIQUE,                  -- JWT 中的 uid (openid SHA256 前12位)
  openid_hash   TEXT    UNIQUE,                           -- openid 完整 SHA256 (微信用户)
  type          TEXT    NOT NULL DEFAULT 'guest',         -- guest / wechat / anonymous
  nickname      TEXT    DEFAULT '',                       -- 昵称
  avatar_url    TEXT    DEFAULT '',                       -- 头像 URL
  vip_level     INTEGER NOT NULL DEFAULT 0,               -- VIP 等级: 0=免费 1=基础 2=专业 3=旗舰
  vip_expire_at INTEGER DEFAULT 0,                        -- VIP 到期时间 (unix timestamp)
  daily_quota   INTEGER NOT NULL DEFAULT 10,              -- 每日免费额度
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_users_uid         ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_openid_hash ON users(openid_hash);
CREATE INDEX IF NOT EXISTS idx_users_type        ON users(type);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  历史记录表
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL DEFAULT 0,               -- 0 = 游客/未登录
  type          TEXT    NOT NULL DEFAULT 'analyze',        -- analyze / edit / generate
  image_url     TEXT    DEFAULT '',                        -- 原图 URL/base64 (缩略)
  prompt_cn     TEXT    DEFAULT '',                        -- 中文提示词
  prompt_en     TEXT    DEFAULT '',                        -- 英文提示词
  style         TEXT    DEFAULT '',                        -- 风格
  result_json   TEXT    DEFAULT '',                        -- 完整分析结果 JSON
  generated_url TEXT    DEFAULT '',                        -- 生成的图片 URL
  favorite      INTEGER NOT NULL DEFAULT 0,                -- 0=未收藏 1=已收藏
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_user_id    ON history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_type       ON history(type);
CREATE INDEX IF NOT EXISTS idx_history_favorite   ON history(user_id, favorite);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(user_id, created_at DESC);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  用户偏好表 (key-value 灵活结构)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS user_preferences (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  pref_key   TEXT    NOT NULL,                             -- 偏好键: theme / language / quality / size 等
  pref_value TEXT    NOT NULL DEFAULT '',                  -- 偏好值
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, pref_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prefs_user_key ON user_preferences(user_id, pref_key);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  VIP 订阅表 (预留)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS vip_subscriptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  plan          TEXT    NOT NULL DEFAULT 'basic',          -- basic / pro / ultimate
  status        TEXT    NOT NULL DEFAULT 'active',         -- active / expired / cancelled
  started_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  expire_at     INTEGER NOT NULL,                          -- 到期时间
  payment_no    TEXT    DEFAULT '',                         -- 支付单号
  amount_cents  INTEGER DEFAULT 0,                          -- 金额 (分)
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vip_user_id    ON vip_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_status     ON vip_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_vip_expire_at  ON vip_subscriptions(expire_at);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  提示词分类表
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS prompt_categories (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL UNIQUE,                   -- 分类名: 人像摄影 / 海报设计 / 信息图 等
  name_en      TEXT    DEFAULT '',                        -- 英文名
  icon         TEXT    DEFAULT '',                        -- 分类图标 (emoji)
  sort_order   INTEGER NOT NULL DEFAULT 0,                -- 排序权重
  prompt_count INTEGER NOT NULL DEFAULT 0,                -- 提示词数量 (缓存)
  created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_cat_name ON prompt_categories(name);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  提示词库表
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS prompt_library (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id    INTEGER NOT NULL DEFAULT 0,              -- 分类 ID
  title          TEXT    NOT NULL,                         -- 标题/简短描述
  prompt_text    TEXT    NOT NULL,                         -- 完整提示词内容
  prompt_hash    TEXT    NOT NULL UNIQUE,                  -- SHA256 去重哈希
  source         TEXT    DEFAULT '',                       -- 来源仓库: freestylefly / youmind / anil-matcha
  source_url     TEXT    DEFAULT '',                       -- 原始链接
  author         TEXT    DEFAULT '',                       -- 原始作者
  language       TEXT    DEFAULT 'zh',                     -- zh / en / ja / mixed
  is_template    INTEGER NOT NULL DEFAULT 0,              -- 0=普通 1=含参数模板
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

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  提示词互动表 (浏览/点赞/复制)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS prompt_interactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL DEFAULT 0,
  prompt_id     INTEGER NOT NULL,
  action        TEXT    NOT NULL,                         -- view / like / copy
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, prompt_id, action)
);

CREATE INDEX IF NOT EXISTS idx_interact_user   ON prompt_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interact_prompt ON prompt_interactions(prompt_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  提示词收藏表
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  用户自创提示词表（含社区分享）
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS user_prompts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  title         TEXT    NOT NULL,
  prompt_text   TEXT    NOT NULL,
  category_id   INTEGER DEFAULT 0,
  is_public     INTEGER NOT NULL DEFAULT 0,              -- 0=私密 1=公开(社区可见)
  image_url     TEXT    DEFAULT '',                       -- 示例图片 URL (COS)
  image_hash    TEXT    DEFAULT '',                       -- 图片指纹(去重/校验)
  view_count    INTEGER NOT NULL DEFAULT 0,               -- 浏览数
  like_count    INTEGER NOT NULL DEFAULT 0,               -- 点赞数
  status        TEXT    NOT NULL DEFAULT 'published',     -- published / pending_review / hidden / reported
  report_count  INTEGER NOT NULL DEFAULT 0,               -- 举报次数
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_prompts_uid    ON user_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prompts_pub   ON user_prompts(is_public, status);
CREATE INDEX IF NOT EXISTS idx_user_prompts_likes ON user_prompts(like_count DESC);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  社区举报表
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS community_reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id     INTEGER NOT NULL,
  reporter_id   INTEGER NOT NULL,
  reason        TEXT    NOT NULL DEFAULT '',
  description   TEXT    DEFAULT '',
  status        TEXT    NOT NULL DEFAULT 'pending',
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (prompt_id) REFERENCES user_prompts(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reports_prompt ON community_reports(prompt_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON community_reports(status);
`

// ══════════════════════════════════════════
//  兼容迁移: 为已存在的数据库添加新列
// ══════════════════════════════════════════
function runMigrations() {
  // user_prompts 新增字段
  const userPromptsCols = db.prepare('PRAGMA table_info(user_prompts)').all()
  const colNames = userPromptsCols.map(c => c.name)

  const newColumns = [
    { name: 'image_url',     sql: "ALTER TABLE user_prompts ADD COLUMN image_url TEXT DEFAULT ''" },
    { name: 'image_hash',    sql: "ALTER TABLE user_prompts ADD COLUMN image_hash TEXT DEFAULT ''" },
    { name: 'view_count',    sql: "ALTER TABLE user_prompts ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0" },
    { name: 'like_count',    sql: "ALTER TABLE user_prompts ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0" },
    { name: 'status',        sql: "ALTER TABLE user_prompts ADD COLUMN status TEXT NOT NULL DEFAULT 'published'" },
    { name: 'report_count',  sql: "ALTER TABLE user_prompts ADD COLUMN report_count INTEGER NOT NULL DEFAULT 0" },
  ]

  for (const col of newColumns) {
    if (!colNames.includes(col.name)) {
      try {
        db.exec(col.sql)
        logger.info(`[DB Migration] 添加列 user_prompts.${col.name}`)
      } catch (e) {
        // 列可能已存在，忽略
      }
    }
  }
}

runMigrations()

// 执行建表
db.exec(CREATE_TABLES)
logger.info(`[DB] 数据库初始化完成: ${DB_PATH}`)

export default db