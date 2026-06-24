#!/usr/bin/env python3
"""
从 BoltPrompt-nanobanana-prompts 导入 8000+ 提示词到 MySQL 数据库
数据源: scripts/bolt_prompts.json (从 GitHub 仓库下载)
图片: 热链接 bolt-series.cn demo 站

使用方法:
  cd scripts
  python3 import_bolt_prompts.py
"""

import json
import hashlib
import os
import urllib.parse

try:
    import mysql.connector
except ImportError:
    print("❌ 缺少 mysql.connector，请安装: pip install mysql-connector-python")
    exit(1)

# ─── 配置 ────────────────────────────────────────────
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'passwd': '12345678',
    'database': 'turing_drawing',
    'charset': 'utf8mb4',
}
JSON_PATH = os.path.join(os.path.dirname(__file__), 'bolt_prompts.json')
IMAGE_BASE_URL = 'https://bolt-series.cn/prompt/assets/'

# 分类名 → emoji 映射
CATEGORY_ICONS = {
    '建筑室内空间设计': '🏠',
    '电商产品虚拟摄影': '📸',
    '创意广告品牌设计': '🎨',
    '创意脑洞特效合成': '🌀',
    '人物肖像与写实摄影': '👤',
    '图文排版视觉传达': '📐',
    '艺术插画创意风格': '🖌',
    '图像分析信息拆解': '🔍',
    '故事分镜角色设定': '🎬',
    '卡通漫画电影角色': '🦸',
    '图像编辑与修复增强': '🔧',
    '手工玩具手办': '🧸',
    '虚拟购物试穿试用': '👗',
    '社交媒体营销': '📱',
    '特定场景环境生成': '🌄',
    '表情包趣味拼图': '😂',
}

CATEGORY_EN = {
    '建筑室内空间设计': 'Architecture & Interior',
    '电商产品虚拟摄影': 'E-commerce Photography',
    '创意广告品牌设计': 'Creative Advertising',
    '创意脑洞特效合成': 'Creative Effects',
    '人物肖像与写实摄影': 'Portrait & Realistic Photo',
    '图文排版视觉传达': 'Typography & Visual',
    '艺术插画创意风格': 'Art & Illustration',
    '图像分析信息拆解': 'Image Analysis',
    '故事分镜角色设定': 'Storyboard & Character',
    '卡通漫画电影角色': 'Cartoon & Comic',
    '图像编辑与修复增强': 'Image Editing',
    '手工玩具手办': 'Handcraft & Figures',
    '虚拟购物试穿试用': 'Virtual Try-on',
    '社交媒体营销': 'Social Media Marketing',
    '特定场景环境生成': 'Scene Generation',
    '表情包趣味拼图': 'Meme & Fun',
}


def get_db():
    return mysql.connector.connect(**DB_CONFIG)


def ensure_table_columns(conn):
    """确保 prompt_library 表有 image_url / content_cn / status 列"""
    cursor = conn.cursor()
    # image_url
    cursor.execute("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'prompt_library' AND COLUMN_NAME = 'image_url'
    """, (DB_CONFIG['database'],))
    if cursor.fetchone()[0] == 0:
        cursor.execute("ALTER TABLE prompt_library ADD COLUMN image_url VARCHAR(500) DEFAULT '' COMMENT '示例图片URL'")
        print("  + 添加列 image_url")

    # content_cn
    cursor.execute("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'prompt_library' AND COLUMN_NAME = 'content_cn'
    """, (DB_CONFIG['database'],))
    if cursor.fetchone()[0] == 0:
        cursor.execute("ALTER TABLE prompt_library ADD COLUMN content_cn TEXT COMMENT '中文提示词'")
        print("  + 添加列 content_cn")

    # status
    cursor.execute("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'prompt_library' AND COLUMN_NAME = 'status'
    """, (DB_CONFIG['database'],))
    if cursor.fetchone()[0] == 0:
        cursor.execute("ALTER TABLE prompt_library ADD COLUMN status VARCHAR(20) DEFAULT 'published'")
        print("  + 添加列 status")

    conn.commit()


def ensure_category(conn, name: str, sort_order: int) -> int:
    """获取或创建分类，返回 category_id"""
    cursor = conn.cursor(dictionary=True)
    clean_name = name.split('_', 1)[-1] if '_' in name else name

    cursor.execute("SELECT id FROM prompt_categories WHERE name = %s OR name = %s", (name, clean_name))
    row = cursor.fetchone()
    if row:
        return row['id']

    icon = CATEGORY_ICONS.get(clean_name, '📂')
    name_en = CATEGORY_EN.get(clean_name, clean_name)

    cursor.execute(
        """INSERT INTO prompt_categories (name, name_en, icon, sort_order, prompt_count, created_at)
           VALUES (%s, %s, %s, %s, 0, NOW())""",
        (clean_name, name_en, icon, sort_order)
    )
    conn.commit()
    return cursor.lastrowid


def build_image_url(img_path: str) -> str:
    if not img_path:
        return ''
    normalized = img_path.strip().replace('\\', '/')
    encoded = '/'.join(urllib.parse.quote(part, safe='') for part in normalized.split('/'))
    return f"{IMAGE_BASE_URL}{encoded}"


def make_hash(prompt_text: str, title: str) -> str:
    content = (prompt_text + '|' + title).strip()
    return hashlib.sha256(content.encode('utf-8')).hexdigest()[:32]


def import_prompts():
    print(f'📂 读取数据: {JSON_PATH}')
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        categories = json.load(f)

    total_prompts = sum(len(cat.get('projects', [])) for cat in categories)
    print(f'📊 共 {len(categories)} 个分类, {total_prompts} 条提示词')

    conn = get_db()
    print(f'🔗 MySQL: {DB_CONFIG["host"]}:{DB_CONFIG["port"]}/{DB_CONFIG["database"]}')

    # 确保表结构
    print('🔧 检查表结构...')
    ensure_table_columns(conn)

    inserted = 0
    skipped = 0
    errors = 0

    for cat_idx, cat in enumerate(categories):
        cat_name = cat.get('name', f'unknown_{cat_idx}')
        projects = cat.get('projects', [])
        print(f'\n📁 [{cat_idx+1}/{len(categories)}] {cat_name} ({len(projects)} 条)')

        cat_id = ensure_category(conn, cat_name, cat_idx + 1)
        cat_inserted = 0
        cursor = conn.cursor()

        for proj in projects:
            uuid = proj.get('uuid', '')
            title = proj.get('title', '').strip()
            prompt_origin = proj.get('prompt_origin', '').strip()
            prompt_cn = proj.get('prompt_cn', '').strip()
            author = proj.get('author', '').strip()
            tags_list = proj.get('tags', [])
            imgs = proj.get('imgs', [])

            prompt_text = prompt_origin or prompt_cn or title
            if not prompt_text:
                skipped += 1
                continue

            prompt_hash = make_hash(prompt_text, title)
            cursor.execute("SELECT id FROM prompt_library WHERE prompt_hash = %s", (prompt_hash,))
            if cursor.fetchone():
                skipped += 1
                continue

            image_url = build_image_url(imgs[0]) if imgs else ''
            tags_str = ','.join(tags_list[:10]) if tags_list else ''
            language = 'mixed' if prompt_origin and prompt_cn else ('en' if prompt_origin else 'zh')

            try:
                cursor.execute(
                    """INSERT INTO prompt_library
                       (category_id, title, prompt_text, content_cn, image_url,
                        prompt_hash, source, author, `language`, tags,
                        status, view_count, like_count, copy_count, favorite_count,
                        created_at, updated_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                               0, 0, 0, 0, NOW(), NOW())""",
                    (
                        cat_id,
                        title or prompt_text[:50],
                        prompt_text,
                        prompt_cn,
                        image_url,
                        prompt_hash,
                        'bolt-nanobanana',
                        author,
                        language,
                        tags_str,
                        'published',
                    )
                )
                inserted += 1
                cat_inserted += 1
            except mysql.connector.IntegrityError:
                skipped += 1
            except Exception as e:
                errors += 1
                if errors <= 5:
                    print(f'  ⚠️ 插入失败: {title[:30]}... → {e}')

        # 更新分类 prompt_count
        cursor.execute(
            "UPDATE prompt_categories SET prompt_count = %s WHERE id = %s",
            (cat_inserted, cat_id)
        )
        conn.commit()
        print(f'  ✅ 导入 {cat_inserted} 条')

    print(f'\n{"="*50}')
    print(f'✅ 导入成功: {inserted}')
    print(f'⏭️ 跳过(重复): {skipped}')
    print(f'❌ 错误: {errors}')
    print(f'{"="*50}')

    # 更新所有分类的 prompt_count
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE prompt_categories pc
        SET pc.prompt_count = (
            SELECT COUNT(*) FROM prompt_library pl
            WHERE pl.category_id = pc.id AND pl.status = 'published'
        )
    """)
    conn.commit()

    # 打印分类统计
    cursor = conn.cursor(dictionary=True)
    print(f'\n📊 分类统计:')
    cursor.execute("SELECT name, prompt_count FROM prompt_categories ORDER BY sort_order")
    for row in cursor.fetchall():
        print(f'  {row["name"]}: {row["prompt_count"]} 条')

    cursor.execute("SELECT COUNT(*) as total FROM prompt_library WHERE status = 'published'")
    total = cursor.fetchone()['total']
    print(f'\n🎉 数据库共 {total} 条已发布提示词')

    conn.close()


if __name__ == '__main__':
    import_prompts()
