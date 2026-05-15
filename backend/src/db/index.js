/**
 * ════════════════════════════════════════════
 *  图灵绘境 - 数据库层 (better-sqlite3)
 *  表结构设计: 用户 / 历史记录 / 用户偏好 / VIP
 *  设计原则: 后期好维护 · VIP 预留 · 索引合理
 * ══════════════════════════════════════════
 */
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import logger from '../utils/logger.js'

// 数据库文件路径
const DB_DIR = path.resolve('data')
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
`

// 执行建表
db.exec(CREATE_TABLES)
logger.info(`[DB] 数据库初始化完成: ${DB_PATH}`)

export default db