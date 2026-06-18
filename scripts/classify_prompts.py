#!/usr/bin/env python3
"""对提示词进行分类，不使用JSON格式"""
import mysql.connector
import re

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'passwd': '12345678',
    'database': 'turing_drawing',
    'charset': 'utf8mb4'
}

# 分类规则 - 基于关键词匹配
CATEGORY_RULES = {
    1: {  # 人像/Portrait
        'keywords': ['人像', '人物', '肖像', 'portrait', 'woman', 'man', 'girl', 'boy', '人物', 'face', 'selfie', '头像'],
        'patterns': [r'\b(portrait|person|people|woman|man|girl|boy|人物|人像|肖像|头像)\b']
    },
    2: {  # 海报/Poster
        'keywords': ['海报', 'poster', '宣传', '广告', 'banner', 'cover'],
        'patterns': [r'\b(poster|banner|cover|flyer|海报|宣传)\b']
    },
    3: {  # 信息图/Infographic
        'keywords': ['信息图', '图表', 'infographic', 'diagram', 'chart', '数据', 'map', '地图'],
        'patterns': [r'\b(infographic|diagram|chart|data|map|信息图|图表|地图)\b']
    },
    4: {  # 角色/Character
        'keywords': ['角色', 'character', '动漫', 'anime', '卡通', 'cartoon', 'manga', '游戏角色'],
        'patterns': [r'\b(character|anime|cartoon|manga|角色|动漫)\b']
    },
    5: {  # 游戏美术/Game Art
        'keywords': ['游戏', 'game', 'RPG', '场景', '关卡', 'game art', '游戏美术'],
        'patterns': [r'\b(game|rpg|scene|level|游戏|游戏美术)\b']
    },
    6: {  # UI设计/UI Design
        'keywords': ['UI', '界面', 'app', '网页', 'web', '设计系统', 'dashboard', 'icon', '按钮'],
        'patterns': [r'\b(ui|interface|app|web|dashboard|界面|网页设计)\b']
    },
    7: {  # 插画/Illustration
        'keywords': ['插画', 'illustration', 'drawing', '手绘', '艺术', 'art', 'painting'],
        'patterns': [r'\b(illustration|drawing|art|painting|插画|手绘|艺术)\b']
    },
    8: {  # 字体/Typography
        'keywords': ['字体', 'typography', '文字', 'text', '字母', '书法', 'calligraphy'],
        'patterns': [r'\b(typography|text|font|lettering|calligraphy|字体|文字|书法)\b']
    },
    9: {  # 产品/Product
        'keywords': ['产品', 'product', '商品', '物品', 'object', '3D', '渲染', 'render'],
        'patterns': [r'\b(product|object|item|3d|render|产品|物品|渲染)\b']
    },
    10: {  # 风景/Landscape
        'keywords': ['风景', 'landscape', '自然', 'nature', '建筑', 'architecture', '城市', 'city', '户外'],
        'patterns': [r'\b(landscape|nature|scenery|architecture|city|风景|自然|建筑|城市)\b']
    },
    11: {  # Logo设计
        'keywords': ['logo', '标志', '商标', 'brand', 'branding', '标识'],
        'patterns': [r'\b(logo|brand|标志|商标|标识)\b']
    },
    12: {  # 图像编辑/Image Edit
        'keywords': ['编辑', 'edit', '修饰', 'retouch', '修复', 'restore', '增强', 'enhance', '滤镜', 'filter'],
        'patterns': [r'\b(edit|retouch|restore|enhance|filter|编辑|修饰|修复|增强|滤镜)\b']
    }
}

def classify_prompt(title, prompt_text):
    """根据标题和提示词内容分类"""
    text = f"{title} {prompt_text}".lower()
    
    scores = {}
    for cat_id, rules in CATEGORY_RULES.items():
        score = 0
        # 关键词匹配
        for kw in rules['keywords']:
            if kw.lower() in text:
                score += 2
        # 正则匹配
        for pattern in rules['patterns']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            score += len(matches) * 3
        scores[cat_id] = score
    
    # 返回得分最高的分类
    if scores:
        best = max(scores, key=scores.get)
        if scores[best] > 0:
            return best
    
    return 7  # 默认插画类

def main():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    # 获取所有未分类的提示词
    cursor.execute("""
        SELECT id, title, prompt_text, category_id 
        FROM prompt_library 
        WHERE category_id = 0 OR category_id IS NULL
    """)
    
    prompts = cursor.fetchall()
    print(f"待分类提示词数量: {len(prompts)}")
    
    # 分类统计
    stats = {i: 0 for i in range(1, 13)}
    
    # 更新分类
    update_count = 0
    for prompt in prompts:
        cat_id = classify_prompt(prompt['title'], prompt['prompt_text'])
        
        cursor.execute(
            "UPDATE prompt_library SET category_id = %s WHERE id = %s",
            (cat_id, prompt['id'])
        )
        stats[cat_id] += 1
        update_count += 1
        
        if update_count % 50 == 0:
            print(f"已处理 {update_count}/{len(prompts)}...")
    
    conn.commit()
    
    # 获取分类名称
    cursor.execute("SELECT id, name_en FROM prompt_categories")
    cat_names = {row['id']: row['name_en'] for row in cursor.fetchall()}
    
    print("\n=== 分类结果统计 ===")
    for cat_id, count in sorted(stats.items()):
        if count > 0:
            name = cat_names.get(cat_id, f'Category {cat_id}')
            print(f"  {name}: {count} 条")
    
    print(f"\n总计分类: {update_count} 条")
    
    cursor.close()
    conn.close()

if __name__ == '__main__':
    main()
