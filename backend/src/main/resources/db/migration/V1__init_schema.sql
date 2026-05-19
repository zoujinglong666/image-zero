-- ═══════════════════════════════════════════════════════════════
--  图灵绘境 - MySQL 数据库初始化脚本
--  V1__init_schema.sql
--
--  业务模块:
--  1. 用户体系      - users / user_preferences / vip_subscriptions
--  2. 图片业务      - history
--  3. 提示词库      - prompt_categories / prompt_library
--  4. 提示词互动    - prompt_interactions / prompt_favorites
--  5. 社区 UGC      - user_prompts / community_reports
-- ═══════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  模块一: 用户体系
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1.1 用户表
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT       AUTO_INCREMENT PRIMARY KEY,
    uid             VARCHAR(64)  NOT NULL UNIQUE                  COMMENT 'JWT中的uid (openid SHA256前12位)',
    openid_hash     VARCHAR(128) UNIQUE                           COMMENT 'openid完整SHA256 (微信用户)',
    type            VARCHAR(20)  NOT NULL DEFAULT 'guest'         COMMENT '用户类型: guest/wechat/anonymous',
    nickname        VARCHAR(100) DEFAULT ''                       COMMENT '昵称',
    avatar_url      VARCHAR(500) DEFAULT ''                       COMMENT '头像URL',
    vip_level       INT          NOT NULL DEFAULT 0               COMMENT 'VIP等级: 0=免费 1=基础 2=专业 3=旗舰',
    vip_expire_at   BIGINT       DEFAULT 0                        COMMENT 'VIP到期时间(unix timestamp秒)',
    daily_quota     INT          NOT NULL DEFAULT 10              COMMENT '每日免费额度',
    wechat_openid   VARCHAR(100) UNIQUE                           COMMENT '微信OpenID(绑定后填充)',
    wechat_unionid  VARCHAR(100) UNIQUE                           COMMENT '微信UnionID',
    wechat_nickname VARCHAR(100) DEFAULT ''                       COMMENT '微信昵称',
    wechat_avatar_url VARCHAR(500) DEFAULT ''                     COMMENT '微信头像URL',
    password_hash   VARCHAR(255) DEFAULT NULL                     COMMENT '密码哈希(本地用户)',
    email           VARCHAR(100) UNIQUE                           COMMENT '邮箱',
    is_active       TINYINT(1)   NOT NULL DEFAULT 1               COMMENT '是否启用: 0=禁用 1=启用',
    last_login_at   DATETIME     DEFAULT NULL                     COMMENT '上次登录时间',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_users_uid          (uid),
    INDEX idx_users_openid_hash  (openid_hash),
    INDEX idx_users_type         (type),
    INDEX idx_users_wechat_openid (wechat_openid),
    INDEX idx_users_email        (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 1.2 用户偏好表 (key-value灵活结构)
-- 常用 pref_key: theme / language / quality / size / model
CREATE TABLE IF NOT EXISTS user_preferences (
    id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    pref_key   VARCHAR(50)  NOT NULL,
    pref_value TEXT         NOT NULL DEFAULT '',
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_user_pref_key (user_id, pref_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_prefs_user_key (user_id, pref_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户偏好表';

-- 1.3 VIP订阅表
CREATE TABLE IF NOT EXISTS vip_subscriptions (
    id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT       NOT NULL,
    plan          VARCHAR(20)  NOT NULL DEFAULT 'basic'         COMMENT '套餐: basic/pro/ultimate',
    status        VARCHAR(20)  NOT NULL DEFAULT 'active'        COMMENT '状态: active/expired/cancelled',
    started_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
    expire_at     DATETIME     NOT NULL                          COMMENT '到期时间',
    payment_no    VARCHAR(100) DEFAULT ''                       COMMENT '支付单号',
    amount_cents  INT          DEFAULT 0                        COMMENT '金额(分)',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_vip_user_id   (user_id),
    INDEX idx_vip_status    (status),
    INDEX idx_vip_expire_at (expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='VIP订阅表';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  模块二: 图片业务
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 2.1 历史记录表 (图片分析/生成/编辑)
CREATE TABLE IF NOT EXISTS history (
    id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT       NOT NULL DEFAULT 0               COMMENT '0=游客/未登录',
    type          VARCHAR(20)  NOT NULL DEFAULT 'analyze'       COMMENT '类型: analyze/edit/generate',
    image_url     TEXT         DEFAULT ''                        COMMENT '原图URL/base64(缩略)',
    prompt_cn     TEXT         DEFAULT ''                        COMMENT '中文提示词',
    prompt_en     TEXT         DEFAULT ''                        COMMENT '英文提示词',
    style         VARCHAR(100) DEFAULT ''                       COMMENT '风格',
    result_json   TEXT         DEFAULT ''                        COMMENT '完整分析结果JSON',
    generated_url VARCHAR(500) DEFAULT ''                       COMMENT '生成的图片URL',
    favorite      TINYINT(1)   NOT NULL DEFAULT 0               COMMENT '0=未收藏 1=已收藏',
    is_public     TINYINT(1)   NOT NULL DEFAULT 0               COMMENT '0=私密 1=公开',
    width         INT          DEFAULT NULL                      COMMENT '图片宽度',
    height        INT          DEFAULT NULL                      COMMENT '图片高度',
    file_size     BIGINT       DEFAULT NULL                      COMMENT '文件大小(字节)',
    format        VARCHAR(20)  DEFAULT NULL                     COMMENT '文件格式',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_history_user_id    (user_id),
    INDEX idx_history_type       (type),
    INDEX idx_history_favorite   (user_id, favorite),
    INDEX idx_history_created_at (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='历史记录表';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  模块三: 提示词库 (官方精选)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 3.1 提示词分类表
CREATE TABLE IF NOT EXISTS prompt_categories (
    id           BIGINT       AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL UNIQUE                   COMMENT '分类名(中文)',
    name_en      VARCHAR(100) DEFAULT ''                        COMMENT '英文名',
    icon         VARCHAR(20)  DEFAULT ''                        COMMENT '分类图标(emoji)',
    sort_order   INT          NOT NULL DEFAULT 0                COMMENT '排序权重(越小越靠前)',
    prompt_count INT          NOT NULL DEFAULT 0                COMMENT '提示词数量(缓存)',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_prompt_cat_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词分类表';

-- 3.2 提示词库表 (官方精选)
CREATE TABLE IF NOT EXISTS prompt_library (
    id             BIGINT       AUTO_INCREMENT PRIMARY KEY,
    category_id    BIGINT       NOT NULL DEFAULT 0,
    title          VARCHAR(200) NOT NULL                        COMMENT '标题/简短描述',
    prompt_text    TEXT         NOT NULL                        COMMENT '完整提示词内容',
    prompt_hash    VARCHAR(128) NOT NULL UNIQUE                  COMMENT 'SHA256去重哈希',
    source         VARCHAR(100) DEFAULT ''                      COMMENT '来源仓库',
    source_url     VARCHAR(500) DEFAULT ''                      COMMENT '原始链接',
    author         VARCHAR(100) DEFAULT ''                      COMMENT '原始作者',
    language       VARCHAR(10)  DEFAULT 'zh'                    COMMENT '语言: zh/en/ja/mixed',
    is_template    TINYINT(1)   NOT NULL DEFAULT 0              COMMENT '0=普通 1=含参数模板',
    tags           VARCHAR(500) DEFAULT ''                      COMMENT '逗号分隔标签',
    view_count     INT          NOT NULL DEFAULT 0,
    like_count     INT          NOT NULL DEFAULT 0,
    copy_count     INT          NOT NULL DEFAULT 0,
    favorite_count INT          NOT NULL DEFAULT 0,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES prompt_categories(id),
    INDEX idx_prompt_cat_id    (category_id),
    INDEX idx_prompt_hash      (prompt_hash),
    INDEX idx_prompt_source    (source),
    INDEX idx_prompt_lang      (language),
    INDEX idx_prompt_views     (view_count DESC),
    INDEX idx_prompt_likes     (like_count DESC),
    INDEX idx_prompt_created   (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词库表';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  模块四: 提示词互动
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 4.1 提示词互动表 (浏览/点赞/复制)
CREATE TABLE IF NOT EXISTS prompt_interactions (
    id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT       NOT NULL DEFAULT 0,
    prompt_id     BIGINT       NOT NULL,
    target_type   VARCHAR(20)  NOT NULL DEFAULT 'library'       COMMENT '目标类型: library/community',
    action        VARCHAR(30)  NOT NULL                          COMMENT '动作: view/like/copy/community_like',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_interaction (user_id, prompt_id, target_type, action),
    INDEX idx_interact_user       (user_id),
    INDEX idx_interact_prompt     (prompt_id, target_type),
    INDEX idx_interact_user_action (user_id, prompt_id, target_type, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词互动表';

-- 4.2 提示词收藏表 (仅官方库)
CREATE TABLE IF NOT EXISTS prompt_favorites (
    id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT       NOT NULL,
    prompt_id     BIGINT       NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_user_prompt_fav (user_id, prompt_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (prompt_id) REFERENCES prompt_library(id) ON DELETE CASCADE,
    INDEX idx_fav_user   (user_id),
    INDEX idx_fav_prompt (prompt_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词收藏表';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--  模块五: 社区 UGC
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 5.1 用户自创提示词表（含社区分享）
CREATE TABLE IF NOT EXISTS user_prompts (
    id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT       NOT NULL,
    title         VARCHAR(200) NOT NULL,
    prompt_text   TEXT         NOT NULL,
    category_id   BIGINT       DEFAULT 0,
    tags          VARCHAR(500) DEFAULT ''                      COMMENT '逗号分隔标签',
    is_public     TINYINT(1)   NOT NULL DEFAULT 0              COMMENT '0=私密 1=公开(社区可见)',
    image_url     VARCHAR(500) DEFAULT ''                      COMMENT '示例图片URL(COS)',
    image_hash    VARCHAR(128) DEFAULT ''                      COMMENT '图片指纹(SHA256前32位)',
    view_count    INT          NOT NULL DEFAULT 0,
    like_count    INT          NOT NULL DEFAULT 0,
    copy_count    INT          NOT NULL DEFAULT 0               COMMENT '复制次数',
    status        VARCHAR(20)  NOT NULL DEFAULT 'published'    COMMENT 'published/pending_review/hidden/reported',
    report_count  INT          NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES prompt_categories(id),
    INDEX idx_user_prompts_uid     (user_id),
    INDEX idx_user_prompts_pub     (is_public, status),
    INDEX idx_user_prompts_likes    (like_count DESC),
    INDEX idx_user_prompts_hash     (image_hash),
    INDEX idx_user_prompts_updated  (user_id, updated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户自创提示词表';

-- 5.2 社区举报表
CREATE TABLE IF NOT EXISTS community_reports (
    id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    prompt_id     BIGINT       NOT NULL,
    reporter_id   BIGINT       NOT NULL,
    reason        VARCHAR(30)  NOT NULL DEFAULT 'other'         COMMENT 'spam/inappropriate/copyright/other',
    description   TEXT         DEFAULT '',
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending'       COMMENT 'pending/resolved/dismissed',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (prompt_id) REFERENCES user_prompts(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reports_prompt   (prompt_id),
    INDEX idx_reports_reporter (reporter_id),
    INDEX idx_reports_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社区举报表';