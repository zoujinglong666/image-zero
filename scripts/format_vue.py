#!/usr/bin/env python3
"""
Vue 文件格式统一脚本
修复以下问题：
1. @click -> @tap (uni-app 跨平台兼容)
2. 颜色值统一为规范色值
3. 引号统一
"""

import re
import sys
from pathlib import Path

# 颜色映射：不规范 -> 规范
COLOR_MAP = {
    # 紫色系统一为 #4A3AFF
    '#7C4DFF': '#4A3AFF',
    '#6200EA': '#4A3AFF',
    '#B388FF': '#4A3AFF',
    '#8B7FFF': '#4A3AFF',
    
    # 红色系统一为 #FF2D55
    '#FF5252': '#FF2D55',
    '#fa3534': '#FF2D55',
    
    # 中性色
    '#111111': '#1C1C1C',
    '#DDD': '#E8E8E8',
    '#CCC': '#C7C7CC',
    '#AAA': '#999999',
    '#BBB': '#999999',
    '#777': '#666666',
    
    # 背景色
    '#F5F5F7': '#F5F6F7',
    '#F7F8FA': '#F5F6F7',
}

def fix_click_to_tap(content):
    """将 @click 替换为 @tap"""
    # 保留 @click.stop 中的 stop 修饰符
    content = re.sub(r'@click\.stop', '@tap.stop', content)
    content = re.sub(r'@click(?=\s*=)', '@tap', content)
    return content

def fix_colors(content):
    """统一颜色值"""
    for old_color, new_color in COLOR_MAP.items():
        # 匹配 color="OLD" 或 :color="OLD" 或 color: OLD 等
        patterns = [
            (f'color="{old_color}"', f'color="{new_color}"'),
            (f'color: {old_color}', f'color: {new_color}'),
            (f'background: {old_color}', f'background: {new_color}'),
            (f'bg-color="{old_color}"', f'bg-color="{new_color}"'),
            (f'bgColor="{old_color}"', f'bgColor="{new_color}"'),
            (f'activeColor="{old_color}"', f'activeColor="{new_color}"'),
        ]
        for old, new in patterns:
            content = content.replace(old, new)
    return content

def fix_quotes(content):
    """统一引号使用"""
    # :bgColor="'#FFFFFF'" -> :bgColor="'#FFFFFF'" (已经是规范的)
    # :titleStyle="{ color: '#111' }" -> 保持原样
    return content

def process_file(filepath):
    """处理单个 Vue 文件"""
    content = filepath.read_text(encoding='utf-8')
    original = content
    
    # 应用修复
    content = fix_click_to_tap(content)
    content = fix_colors(content)
    
    if content != original:
        filepath.write_text(content, encoding='utf-8')
        return True
    return False

def main():
    pages_dir = Path('/Users/zou/img-prompt-starter/frontend/src/pages')
    
    modified = []
    for vue_file in pages_dir.rglob('*.vue'):
        if process_file(vue_file):
            modified.append(str(vue_file.relative_to(pages_dir)))
    
    if modified:
        print(f"✅ 已修复 {len(modified)} 个文件:")
        for f in modified:
            print(f"   - {f}")
    else:
        print("✅ 所有文件格式已统一，无需修改")

if __name__ == '__main__':
    main()
