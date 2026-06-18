#!/usr/bin/env python3
"""获取 GPT Image 2 提示词并生成 SQL"""
import requests
import re
import json

def fetch_readme():
    url = 'https://raw.githubusercontent.com/YouMind-OpenLab/awesome-gpt-image-2/main/README_zh.md'
    print(f'正在获取: {url}')
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    return resp.text

def parse_prompts(content):
    """简单解析提示词标题和提示词内容"""
    prompts = []
    
    # 匹配 ### No. X: 标题
    pattern = r'### (No\.\s*\d+):\s*(.+?)\n'
    matches = list(re.finditer(pattern, content))
    
    print(f'找到 {len(matches)} 个提示词标题')
    
    for i, match in enumerate(matches):
        try:
            no = match.group(1).strip()
            title = match.group(2).strip()
            
            # 获取块内容
            start = match.end()
            end = matches[i+1].start() if i+1 < len(matches) else len(content)
            block = content[start:end]
            
            # 提取提示词（在代码块中）
            prompt_match = re.search(r'```\n(.+?)\n```', block, re.DOTALL)
            prompt_text = prompt_match.group(1).strip() if prompt_match else ''
            
            # 提取描述
            desc_match = re.search(r'####\s*描述\s*\n(.+?)(?=\n####)', block, re.DOTALL)
            if not desc_match:
                desc_match = re.search(r'####\s*Description\s*\n(.+?)(?=\n####)', block, re.DOTALL)
            description = desc_match.group(1).strip() if desc_match else ''
            
            # 提取作者
            author_match = re.search(r'\*\*\s*作者.*?\*\*(.+?)\*\*', block)
            if not author_match:
                author_match = re.search(r'\*\*\s*Author.*?\*\*(.+?)\*\*', block)
            author = author_match.group(1).strip() if author_match else 'Unknown'
            
            # 提取图片URL
            img_match = re.search(r'<img src="([^"]+)"', block)
            image_url = img_match.group(1) if img_match else ''
            
            if prompt_text:  # 只保存有提示词的
                prompts.append({
                    'title': title[:200],
                    'description': description[:500] if description else '',
                    'prompt_text': prompt_text,
                    'author': author[:100] if author else 'Unknown',
                    'source_url': f'https://github.com/YouMind-OpenLab/awesome-gpt-image-2',
                    'image_url': image_url[:500] if image_url else '',
                    'language': 'zh',
                    'tags': 'gpt-image-2',
                    'is_template': 1
                })
        except Exception as e:
            print(f'解析 {i+1} 失败: {e}')
            continue
    
    return prompts

def generate_sql(prompts):
    """生成 SQL INSERT 语句"""
    sql_statements = []
    
    for p in prompts:
        # 转义单引号
        title = p['title'].replace("'", "\\'")
        description = p['description'].replace("'", "\\'")
        prompt_text = p['prompt_text'].replace("'", "\\'")
        author = p['author'].replace("'", "\\'")
        source_url = p['source_url'].replace("'", "\\'")
        image_url = p['image_url'].replace("'", "\\'")
        
        sql = f"""INSERT IGNORE INTO prompt_library 
        (category_id, title, prompt_text, content_cn, prompt_hash, source, source_url, author, language, is_template, tags, status)
        VALUES (
            1,  -- 默认分类ID
            '{title}',
            '{prompt_text}',
            '{description}',
            MD5('{prompt_text}'),
            'awesome-gpt-image-2',
            '{source_url}',
            '{author}',
            'zh',
            1,
            '{p['tags']}',
            'published'
        );"""
        sql_statements.append(sql)
    
    return sql_statements

def main():
    print('=== 开始获取提示词 ===')
    
    try:
        content = fetch_readme()
        print(f'✓ 获取成功，内容长度: {len(content)} 字符')
        
        prompts = parse_prompts(content)
        print(f'✓ 解析到 {len(prompts)} 个提示词')
        
        if prompts:
            sql_list = generate_sql(prompts)
            
            # 写入 SQL 文件
            output_file = '/tmp/gpt_image2_prompts_insert.sql'
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write('USE turing_drawing;\n\n')
                f.write('\n'.join(sql_list))
            
            print(f'✓ SQL 已写入: {output_file}')
            print(f'共 {len(sql_list)} 条 INSERT 语句')
            print(f'\n执行命令导入数据库:')
            print(f'mysql -u root -p12345678 turing_drawing < {output_file}')
        else:
            print('⚠️ 未能解析到提示词')
            
    except Exception as e:
        print(f'✗ 失败: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
