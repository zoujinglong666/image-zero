#!/usr/bin/env python3
"""
从 GitHub awesome-gpt-image-2 仓库导入提示词到本地数据库
使用方法: python3 import_gpt_image2_prompts.py
"""

import requests
import re
import mysql.connector
import json
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'passwd': '12345678',
    'database': 'turing_drawing',
    'charset': 'utf8mb4'
}

# GitHub raw 文件路径
GITHUB_RAW = 'https://raw.githubusercontent.com/YouMind-OpenLab/awesome-gpt-image-2/main'

# 分类映射（从英文到中文）
CATEGORY_MAP = {
    'profile-avatar': '个人资料/头像',
    'social-media-post': '社交媒体帖子',
    'infographic-edu-visual': '信息图/教育视觉图',
    'youtube-thumbnail': 'YouTube缩略图',
    'comic-storyboard': '漫画/故事板',
    'product-marketing': '产品营销',
    'ecommerce-main-image': '电商主图',
    'game-asset': '游戏素材',
    'poster-flyer': '海报/传单',
    'app-web-design': 'App/网页设计',
    'photography': '摄影',
    'cinematic-film-still': '电影/电影剧照',
    'anime-manga': '动漫/漫画',
    'illustration': '插画',
    'sketch-line-art': '草图/线稿',
    'comic-graphic-novel': '漫画/图画小说',
    '3d-render': '3D渲染',
    'chibi-q-style': 'Q版/Q萌风',
    'isometric': '等距',
    'pixel-art': '像素艺术',
    'oil-painting': '油画',
    'watercolor': '水彩画',
    'ink-chinese-style': '水墨/中国风',
    'retro-vintage': '复古/怀旧',
    'cyberpunk-sci-fi': '赛博朋克/科幻',
    'minimalism': '极简主义',
    'portrait-selfie': '人像/自拍',
    'influencer-model': '网红/模特',
    'character': '角色',
    'group-couple': '团体/情侣',
    'product': '产品',
    'food-drink': '食品/饮料',
    'fashion-item': '时尚单品',
    'animal-creature': '动物/生物',
    'vehicle': '车辆',
    'architecture-interior': '建筑/室内设计',
    'landscape-nature': '风景/自然',
    'cityscape-street': '城市风光/街道',
    'diagram-chart': '图表',
    'text-typography': '文本/排版',
    'abstract-background': '摘要/背景'
}

def get_or_create_category(conn, category_name: str, category_name_en: str = None) -> int:
    """获取或创建分类ID"""
    cursor = conn.cursor(dictionary=True)
    
    # 先查询是否存在
    cursor.execute(
        "SELECT id FROM prompt_categories WHERE name = %s OR name_en = %s",
        (category_name, category_name_en or category_name)
    )
    result = cursor.fetchone()
    
    if result:
        cursor.close()
        return result['id']
    
    # 创建新分类
    cursor.execute(
        "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM prompt_categories"
    )
    max_sort = cursor.fetchone()
    sort_order = list(max_sort.values())[0] if max_sort else 1
    
    cursor.execute(
        "INSERT INTO prompt_categories (name, name_en, icon, sort_order) VALUES (%s, %s, %s, %s)",
        (category_name, category_name_en or category_name, '🎨', sort_order)
    )
    conn.commit()
    category_id = cursor.lastrowid
    cursor.close()
    
    print(f"  创建分类: {category_name} (ID: {category_id})")
    return category_id

def generate_prompt_hash(prompt_text: str) -> str:
    """生成提示词的唯一hash"""
    return hashlib.md5(prompt_text.encode('utf-8')).hexdigest()

def fetch_readme(language: str = 'en') -> Optional[str]:
    """获取指定语言的README内容"""
    filenames = {
        'en': 'README.md',
        'zh': 'README_zh.md',
        'zh-TW': 'README_zh-TW.md',
        'ja': 'README_ja-JP.md',
        'ko': 'README_ko-KR.md'
    }
    
    filename = filenames.get(language, 'README.md')
    url = f"{GITHUB_RAW}/{filename}"
    
    print(f"正在获取 {filename}...")
    
    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        response.encoding = 'utf-8'
        return response.text
    except Exception as e:
        print(f"获取失败: {e}")
        return None

def parse_prompts_from_markdown(content: str, language: str = 'en') -> List[Dict[str, Any]]:
    """
    解析 Markdown 内容，提取提示词信息
    
    README 结构：
    ### No. X: Title
    ![Language-EN](...) ![Featured](...) ![Raycast](...)
    
    #### 📖 Description
    Description text
    
    #### 📝 Prompt (or 提示词)
    ```json
    { prompt content }
    ```
    
    #### 🖼️ Generated Images (or 生成图片)
    ##### Image 1
    <img src="..." />
    
    #### 📌 Details (or 详情)
    - **作者:** ...
    - **来源:** ...
    - **发布时间:** ...
    - **多语言:** ...
    """
    prompts = []
    
    # 分割成多个提示词块
    # 使用正则表达式匹配 ### No. X: Title
    pattern = r'### (No\.\s*\d+)[:\s]+(.+?)(?=\n|$)'
    
    # 找到所有标题位置
    matches = list(re.finditer(pattern, content, re.MULTILINE))
    
    print(f"找到 {len(matches)} 个提示词条目")
    
    for i, match in enumerate(matches):
        try:
            prompt_no = match.group(1).strip()
            title = match.group(2).strip()
            
            # 获取这个提示词块的内容（从当前位置到下一个标题）
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(content)
            block = content[start_pos:end_pos]
            
            # 提取描述
            desc_match = re.search(r'#### 📖 (?:Description|描述)\s*\n(.+?)(?=\n####|\n###|\Z)', block, re.DOTALL)
            description = desc_match.group(1).strip() if desc_match else ''
            
            # 提取提示词内容
            prompt_match = re.search(r'#### 📝 (?:Prompt|提示词)\s*\n```(?:\w+)?\n(.+?)\n```', block, re.DOTALL)
            prompt_text = prompt_match.group(1).strip() if prompt_match else ''
            
            if not prompt_text:
                # 尝试其他格式
                prompt_match2 = re.search(r'```\n(.+?)\n```', block, re.DOTALL)
                prompt_text = prompt_match2.group(1).strip() if prompt_match2 else ''
            
            # 提取图片URL
            img_matches = re.findall(r'<img src="([^"]+)"', block)
            images = img_matches if img_matches else []
            
            # 提取作者
            author_match = re.search(r'\*\*(?:作者|Author)[:\s]*\**\s*(.+?)(?:\n|\[)', block)
            author = author_match.group(1).strip() if author_match else 'Unknown'
            
            # 如果作者包含链接，提取文本
            author_link_match = re.search(r'\[([^\]]+)\]', author)
            if author_link_match:
                author = author_link_match.group(1)
            
            # 提取来源URL
            source_match = re.search(r'\*\*(?:来源|Source)[:\s]*\**\s*\[?[^\]]*\]?\(([^)]+)\)', block)
            source_url = source_match.group(1).strip() if source_match else ''
            
            # 提取发布日期
            date_match = re.search(r'\*\*(?:发布时间|Published)[:\s]*\**\s*(.+?)(?:\n|$)', block)
            published_date = date_match.group(1).strip() if date_match else ''
            
            # 检查是否精选
            is_featured = '⭐' in block or 'Featured' in block
            
            # 提取语言标签
            lang_tags = re.findall(r'Language-(\w+)', block)
            prompt_lang = lang_tags[0].lower() if lang_tags else language
            
            # 提取标签
            tags = []
            if 'Featured' in block:
                tags.append('featured')
            if 'Raycast' in block:
                tags.append('raycast')
            
            # 提取分类（如果有）
            category = 'general'
            # 从标题推断分类
            title_lower = title.lower()
            for cat_key, cat_name in CATEGORY_MAP.items():
                if cat_key.replace('-', ' ') in title_lower:
                    category = cat_key
                    break
            
            # 清理标题
            # 移除开头的特殊字符
            title = re.sub(r'^[^\w\u4e00-\u9fff]+', '', title)
            
            if prompt_text:  # 只保存有实际内容的
                prompts.append({
                    'title': title,
                    'description': description,
                    'prompt_text': prompt_text,
                    'author': author,
                    'source_url': source_url,
                    'image_url': images[0] if images else '',
                    'featured_image_url': images[1] if len(images) > 1 else '',
                    'is_featured': is_featured,
                    'language': prompt_lang,
                    'category': category,
                    'tags': ','.join(tags),
                    'published_date': published_date,
                    'raw_block': block[:1000]  # 保存部分原始内容用于调试
                })
                
        except Exception as e:
            print(f"解析条目 {i+1} 失败: {e}")
            continue
    
    return prompts

def insert_prompt(conn, prompt_data: Dict[str, Any], category_id: int) -> bool:
    """插入提示词到数据库"""
    cursor = conn.cursor()
    
    # 生成hash用于去重
    prompt_hash = generate_prompt_hash(prompt_data['prompt_text'])
    
    # 检查是否已存在
    cursor.execute(
        "SELECT id FROM prompt_library WHERE prompt_hash = %s",
        (prompt_hash,)
    )
    if cursor.fetchone():
        cursor.close()
        return False  # 已存在，跳过
    
    insert_sql = """
    INSERT INTO prompt_library 
        (category_id, title, prompt_text, content_cn, prompt_hash, source, 
         source_url, author, language, is_template, tags, status)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    try:
        cursor.execute(insert_sql, (
            category_id,
            prompt_data['title'][:200],  # 截断标题
            prompt_data['prompt_text'],
            prompt_data['description'],  # content_cn
            prompt_hash,
            'awesome-gpt-image-2',
            prompt_data['source_url'][:500] if prompt_data.get('source_url') else '',
            prompt_data.get('author', 'Unknown')[:100] if prompt_data.get('author') else 'Unknown',
            prompt_data.get('language', 'en'),
            1 if prompt_data.get('is_featured') else 0,
            prompt_data.get('tags', ''),
            'published'
        ))
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        print(f"插入失败: {e}")
        cursor.close()
        return False

def main():
    print("=" * 60)
    print("GitHub awesome-gpt-image-2 提示词导入工具")
    print("=" * 60)
    
    # 连接数据库
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        print("✓ 数据库连接成功")
    except Exception as e:
        print(f"✗ 数据库连接失败: {e}")
        return
    
    # 获取/创建默认分类
    default_category_id = get_or_create_category(conn, 'GPT Image 2', 'gpt-image-2')
    
    # 支持多语言README
    languages = ['zh', 'en']  # 优先中文
    
    total_imported = 0
    total_skipped = 0
    
    for lang in languages:
        print(f"\n正在处理 {lang.upper()} 版本...")
        
        # 获取README内容
        content = fetch_readme(lang)
        if not content:
            print(f"跳过 {lang} 版本")
            continue
        
        print(f"获取到 {len(content)} 字符")
        
        # 解析提示词
        prompts = parse_prompts_from_markdown(content, lang)
        print(f"解析到 {len(prompts)} 个提示词")
        
        # 插入数据库
        for i, prompt in enumerate(prompts):
            # 获取或创建分类
            cat_name = CATEGORY_MAP.get(prompt.get('category', ''), 'GPT Image 2')
            cat_id = get_or_create_category(conn, cat_name, prompt.get('category', ''))
            
            if insert_prompt(conn, prompt, cat_id):
                total_imported += 1
                if total_imported % 10 == 0:
                    print(f"  已导入 {total_imported} 条...")
            else:
                total_skipped += 1
    
    # 更新分类计数
    print("\n更新分类计数...")
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE prompt_categories pc
        SET prompt_count = (
            SELECT COUNT(*) FROM prompt_library pl
            WHERE pl.category_id = pc.id
        )
    """)
    conn.commit()
    cursor.close()
    
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"导入完成!")
    print(f"  成功导入: {total_imported} 条")
    print(f"  跳过(重复): {total_skipped} 条")
    print("=" * 60)

if __name__ == '__main__':
    main()
