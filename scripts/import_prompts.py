#!/usr/bin/env python3
"""
从 GitHub awesome-gpt-image-2 仓库导入提示词到本地数据库
Usage: python3 import_prompts.py
"""

import requests
import json
import mysql.connector
import re
import time
from typing import List, Dict, Any

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'passwd': '12345678',
    'database': 'turing_drawing',
    'charset': 'utf8mb4'
}

# GitHub API 配置
GITHUB_API = 'https://api.github.com/repos/YouMind-OpenLab/awesome-gpt-image-2'
RAW_BASE = 'https://raw.githubusercontent.com/YouMind-OpenLab/awesome-gpt-image-2/main'

def get_all_prompts() -> List[Dict[str, Any]]:
    """
    从 GitHub README 解析所有提示词
    由于 README 是 Markdown 格式，我们需要解析每个提示词的详细信息
    """
    prompts = []
    
    try:
        # 获取 README 内容
        readme_url = f'{RAW_BASE}/README.md'
        print(f'正在获取 README: {readme_url}')
        
        response = requests.get(readme_url, timeout=30)
        response.raise_for_status()
        
        content = response.text
        
        # 使用正则表达式提取提示词块
        # 格式: ### No. X: Title + 描述 + 提示词 + 图片 + 详情
        
        # 提取所有 ### 开头的提示词条目
        pattern = r'### (No\.\s+\d+):\s+(.+?)\n'
        matches = re.findall(pattern, content, re.MULTILINE)
        
        print(f'找到 {len(matches)} 个提示词标题')
        
        # 由于 README 结构复杂，我们改用 GitHub API 获取目录结构
        # 实际项目中提示词可能存储在单独的文件或目录中
        
        return prompts
        
    except Exception as e:
        print(f'获取失败: {e}')
        return prompts

def get_prompts_from_readme_zh() -> List[Dict[str, Any]]:
    """
    从中文 README 解析提示词
    中文 README 可能结构更清晰
    """
    prompts = []
    
    try:
        readme_zh_url = f'{RAW_BASE}/README_zh.md'
        print(f'正在获取中文 README: {readme_zh_url}')
        
        response = requests.get(readme_zh_url, timeout=30)
        response.raise_for_status()
        
        content = response.text
        
        # 解析提示词块
        # 查找 ### No. X: 格式的标题
        sections = re.split(r'### (No\.\s+\d+):\s+(.+?)\n', content)
        
        print(f'中文 README 大小: {len(content)} 字符')
        
        return prompts
        
    except Exception as e:
        print(f'获取中文 README 失败: {e}')
        return prompts

def create_table_if_not_exists(conn):
    """创建提示词模板表"""
    cursor = conn.cursor()
    
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS prompt_templates (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL COMMENT '标题',
        description TEXT COMMENT '描述',
        prompt_text TEXT NOT NULL COMMENT '提示词内容',
        category VARCHAR(100) COMMENT '分类',
        style VARCHAR(100) COMMENT '风格',
        subject VARCHAR(100) COMMENT '主体',
        language VARCHAR(20) DEFAULT 'en' COMMENT '语言',
        author VARCHAR(255) COMMENT '作者',
        source_url VARCHAR(500) COMMENT '来源URL',
        image_url VARCHAR(500) COMMENT '示例图片URL',
        tags VARCHAR(500) COMMENT '标签，逗号分隔',
        is_featured BOOLEAN DEFAULT FALSE COMMENT '是否精选',
        use_count INT DEFAULT 0 COMMENT '使用次数',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_style (style),
        INDEX idx_subject (subject),
        INDEX idx_featured (is_featured),
        INDEX idx_language (language)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词模板表'
    """
    
    try:
        cursor.execute(create_table_sql)
        conn.commit()
        print('✓ 表 prompt_templates 已创建或已存在')
    except Exception as e:
        print(f'创建表失败: {e}')
    finally:
        cursor.close()

def insert_prompt(conn, prompt_data: Dict[str, Any]) -> bool:
    """插入单个提示词到数据库"""
    cursor = conn.cursor()
    
    insert_sql = """
    INSERT IGNORE INTO prompt_templates 
        (title, description, prompt_text, category, style, subject, 
         language, author, source_url, image_url, tags, is_featured)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    try:
        cursor.execute(insert_sql, (
            prompt_data.get('title', ''),
            prompt_data.get('description', ''),
            prompt_data.get('prompt_text', ''),
            prompt_data.get('category', ''),
            prompt_data.get('style', ''),
            prompt_data.get('subject', ''),
            prompt_data.get('language', 'en'),
            prompt_data.get('author', ''),
            prompt_data.get('source_url', ''),
            prompt_data.get('image_url', ''),
            prompt_data.get('tags', ''),
            prompt_data.get('is_featured', False)
        ))
        conn.commit()
        return True
    except Exception as e:
        print(f'插入失败: {e}')
        return False
    finally:
        cursor.close()

def main():
    print('=== 开始导入提示词 ===')
    
    # 连接数据库
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        print('✓ 数据库连接成功')
    except Exception as e:
        print(f'✗ 数据库连接失败: {e}')
        return
    
    # 创建表
    create_table_if_not_exists(conn)
    
    # 获取提示词
    print('\n正在获取提示词列表...')
    prompts = get_all_prompts()
    
    if not prompts:
        print('尝试从中文 README 获取...')
        prompts = get_prompts_from_readme_zh()
    
    if not prompts:
        print('⚠️ 未能获取到提示词，请检查仓库结构')
        print('提示: 该仓库的提示词可能存储在单独的 JSON 或 Markdown 文件中')
        
        # 尝试常见的文件路径
        possible_files = [
            'prompts.json',
            'data/prompts.json',
            'prompts/prompts.json',
            'README_zh.md'
        ]
        
        for file in possible_files:
            url = f'{RAW_BASE}/{file}'
            try:
                print(f'尝试获取: {url}')
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    print(f'✓ 找到文件: {file}')
                    print(f'内容大小: {len(response.text)} 字符')
                    break
            except:
                continue
    
    conn.close()
    print('\n=== 导入完成 ===')

if __name__ == '__main__':
    main()
