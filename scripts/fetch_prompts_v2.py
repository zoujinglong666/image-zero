#!/usr/bin/env python3
"""获取 GPT Image 2 提示词并生成 SQL（修复版）"""
import requests
import re
import hashlib

def fetch_readme():
    url = 'https://raw.githubusercontent.com/YouMind-OpenLab/awesome-gpt-image-2/main'
    print(f'正在获取 README_zh.md...')
    resp = requests.get(f'{url}/README_zh.md', timeout=60)
    resp.raise_for_status()
    return resp.text

def parse_prompts(content):
    """解析提示词"""
    prompts = []
    
    # 匹配标题
    pattern = r'### (No\.\s*\d+?)[:\s]+(.+?)(?=\n|$)'
    matches = list(re.finditer(pattern, content))
    
    print(f'找到 {len(matches)} 个提示词')
    
    for i, match in enumerate(matches):
        try:
            prompt_no = match.group(1).strip()
            title = match.group(2).strip()
            
            # 获取块内容
            start = match.end()
            end = matches[i+1].start() if i+1 < len(matches) else len(content)
            block = content[start:end]
            
            # 提取描述
            desc_match = re.search(r'####\s*描述\s*\n(.+?)(?=\n####|\n###)', block, re.DOTALL)
            description = desc_match.group(1).strip() if desc_match else ''
            
            # 提取提示词
            prompt_match = re.search(r'```\n(.+?)\n```', block, re.DOTALL)
            prompt_text = prompt_match.group(1).strip() if prompt_match else ''
            
            if prompt_text:
                prompts.append({
                    'title': title,
                    'description': description,
                    'prompt_text': prompt_text,
                    'language': 'zh'
                })
                
        except Exception as e:
            print(f'解析 {i+1} 失败: {e}')
            continue
    
    return prompts

def generate_sql(prompts):
    """生成 SQL INSERT 语句（不带 MD5 函数）"""
    sql_list = []
    
    for p in prompts:
        # 生成 MD5 hash
        prompt_hash = hashlib.md5(p['prompt_text'].encode('utf-8')).hexdigest()
        
        # 转义
        title = p['title'].replace("'", "''")
        description = p['description'].replace("'", "''")
        prompt_text = p['prompt_text'].replace("'", "''")
        
        sql = f"""INSERT IGNORE INTO prompt_library 
        (category_id, title, prompt_text, content_cn, prompt_hash, source, source_url, language, is_template, tags, status)
        VALUES (
            1,
            '{title}',
            '{prompt_text}',
            '{description}',
            '{prompt_hash}',
            'awesome-gpt-image-2',
            'https://github.com/YouMind-OpenLab/awesome-gpt-image-2',
            'zh',
            1,
            'gpt-image-2',
            'published'
        );"""
        sql_list.append(sql)
    
    return sql_list

def main():
    print('== 开始获取提示词 ==')
    
    try:
        content = fetch_readme()
        print(f'✓ 获取成功，内容长度: {len(content)} 字符')
        
        prompts = parse_prompts(content)
        print(f'✓ 解析到 {len(prompts)} 个提示词')
        
        if prompts:
            sql_list = generate_sql(prompts)
            
            output_file = '/tmp/gpt_image2_prompts_insert_v2.sql'
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
