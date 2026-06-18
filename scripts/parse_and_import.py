#!/usr/bin/env python3
"""解析本地 README_zh.md 并导入数据库"""
import re
import hashlib
import subprocess
import os

DB_CONFIG = {
    'user': 'root',
    'passwd': '12345678',
    'database': 'turing_drawing',
    'charset': 'utf8mb4'
}

def parse_prompts(filename):
    """解析中文 README"""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    prompts = []
    
    # 分割每个提示词块
    # 格式: ### No. X: 标题
    blocks = re.split(r'### (No\.\s*\d+[:\s])', content)
    
    print(f'文件大小: {len(content)} 字符, 分成 {len(blocks)} 块')
    
    # blocks[0] 是文件开头到第一个 ### 之前的内容
    # blocks[1], blocks[3], ... 是标题
    # blocks[2], blocks[4], ... 是内容
    
    for i in range(1, len(blocks), 2):
        if i + 1 >= len(blocks):
            break
            
        title = blocks[i].strip()
        block = blocks[i+1]
        
        try:
            # 提取描述
            desc_match = re.search(r'####\s*描述\s*\n(.+?)(?=\n####)', block, re.DOTALL)
            description = desc_match.group(1).strip() if desc_match else ''
            
            # 提取提示词（在 ``` 代码块中）
            prompt_match = re.search(r'```\n(.+?)\n```', block, re.DOTALL)
            prompt_text = prompt_match.group(1).strip() if prompt_match else ''
            
            if prompt_text:
                prompts.append({
                    'title': title[:200],
                    'description': description[:500],
                    'prompt_text': prompt_text,
                    'language': 'zh'
                })
                if len(prompts) % 10 == 0:
                    print(f'已解析 {len(prompts)} 条...')
        
        except Exception as e:
            print(f'解析块 {i//2 + 1} 失败: {e}')
            continue
    
    return prompts

def generate_sql_file(prompts, output_file):
    """生成 SQL 文件"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('USE turing_drawing;\n')
        f.write('SET NAMES utf8mb4;\n\n')
        
        for p in prompts:
            # 生成 MD5
            prompt_hash = hashlib.md5(p['prompt_text'].encode('utf-8')).hexdigest()
            
            # 转义
            title = p['title'].replace("\\", "\\\\").replace("'", "\\'")
            description = p['description'].replace("\\", "\\\\").replace("'", "\\'")
            prompt_text = p['prompt_text'].replace("\\", "\\\\").replace("'", "\\'")
            
            sql = f"""INSERT IGNORE INTO prompt_library 
        (category_id, title, prompt_text, content_cn, prompt_hash, source, language, is_template, tags, status)
        VALUES (
            1, 
            '{title}',
            '{prompt_text}',
            '{description}',
            '{prompt_hash}',
            'awesome-gpt-image-2',
            'zh',
            1,
            'gpt-image-2',
            'published'
        );\n"""
            f.write(sql)
    
    print(f'✓ SQL 已写入: {output_file}')
    print(f'  共 {len(prompts)} 条 INSERT 语句')

def main():
    print('=== 开始解析 ===')
    
    filename = '/tmp/README_zh.md'
    if not os.path.exists(filename):
        print(f'文件不存在: {filename}')
        print('请先下载: curl -L "https://raw.githubusercontent.com/YouMind-OpenLab/awesome-gpt-image-2/main/README_zh.md" -o /tmp/README_zh.md')
        return
    
    print(f'正在解析: {filename}')
    prompts = parse_prompts(filename)
    
    if not prompts:
        print('⚠️ 未解析到提示词')
        return
    
    print(f'✓ 解析到 {len(prompts)} 个提示词')
    
    output_file = '/tmp/gpt_image2_insert.sql'
    generate_sql_file(prompts, output_file)
    
    print(f'\n执行导入: mysql -u root -p12345678 < {output_file}')

if __name__ == '__main__':
    main()
