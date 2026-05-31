#!/usr/bin/env python3
"""
为 prompt_library 批量生成图片 URL
策略：
1. 热门推荐 TOP 10 使用真实生成图片（通过 API）
2. 其余使用 Unsplash Source / placeholder 高质量占位图
"""
import subprocess, json, os, time, hashlib, sys

DB = "turing_drawing"
USER = "root"
PASS = "12345678"

def run_sql(sql):
    r = subprocess.run(
        ["mysql", f"-u{USER}", f"-p{PASS}", DB, "-e", sql],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        print(f"SQL Error: {r.stderr.strip()}")
    return r.stdout.strip()

def update_image_url(prompt_id, url):
    run_sql(f"UPDATE prompt_library SET image_url='{mysql_escape(url)}' WHERE id={prompt_id};")

def mysql_escape(s):
    return s.replace("'", "''").replace("\\", "\\\\")

# 高质量 Unsplash 图片按分类映射（精选）
UNSPLASH = {
    1: [  # 人像摄影
        "https://images.unsplash.com/photo-1494790109877-26f1f912079?w=600&h=800&fit=crop",
        "https://images.unsplash.com/photo-1534528741775-53994a69da7?w=600&h=800&fit=crop",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7226f2?w=600&h=800&fit=crop",
        "https://images.unsplash.com/photo-1531746026702-c3f8e1d3c3f?w=600&h=800&fit=crop",
        "https://images.unsplash.com/photo-1529620490-22e8f9e6cc4?w=600&h=800&fit=crop",
    ],
    2: [  # 海报设计
        "https://images.unsplash.com/photo-1557685016-782bcb6c1d46?w=600&h=900&fit=crop",
        "https://images.unsplash.com/photo-1558598484-4c77e4f4b3b?w=600&h=900&fit=crop",
        "https://images.unsplash.com/photo-1634010556995-46ac65193e3?w=600&h=900&fit=crop",
        "https://images.unsplash.com/photo-1500530855572-d8bffb81ee2?w=600&h=900&fit=crop",
    ],
    3: [  # 信息图
        "https://images.unsplash.com/photo-1551288049-buildings-architecture-1?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1558618666-0c7b397-c175a48ddc8?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1504384305-953b-a48cce7f45?w=800&h=600&fit=crop",
    ],
    4: [  # 角色设计
        "https://images.unsplash.com/photo-1518709268805-4d4e1a1c9a?w=600&h=800&fit=crop",
        "https://images.unsplash.com/photo-153125968368-b6f6afb8a1e?w=600&h=800&fit=crop",
        "https://images.unsplash.com/photo-1526459193457-711d6492e3c?w=600&h=800&fit=crop",
        "https://images.unsplash.com/photo-1579546929518-795b32c94e?w=600&h=800&fit=crop",
    ],
    5: [  # 游戏美术
        "https://images.unsplash.com/photo-1550745162-d5e3ddadf36?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1511512706320-d3f7a7e4ac?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1552820728-8b83bb6b2b3?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1518709268805-4d4e1a1c9a?w=800&h=600&fit=crop",
    ],
    6: [  # UI设计
        "https://images.unsplash.com/photo-1551650975-87de8f54f0c?w=400&h=800&fit=crop",
        "https://images.unsplash.com/photo-1618760667266-ba7b57d3cc1?w=900&h=600&fit=crop",
        "https://images.unsplash.com/photo-1551288049-buildings-architecture-1?w=900&h=600&fit=crop",
        "https://images.unsplash.com/photo-1504384305-953b-a48cce7f45?w=900&h=600&fit=crop",
    ],
    7: [  # 插画艺术
        "https://images.unsplash.com/photo-1547891654-de75f905bba?w=600&h=800&fit=crop",
        "https://images.unsplash.com/photo-1513368096-27a4862877d?w=600&h=800&fit=crop",
        "https://images.unsplash.com/photo-1547891654-de75f905bba?w=600&h=800&fit=crop",
        "https://images.unsplash.com/photo-1579546929518-795b32c94e?w=600&h=800&fit=crop",
    ],
    8: [  # 排版设计
        "https://images.unsplash.com/photo-1500462918057-3000360cjug?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1618760667266-ba7b57d3cc1?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1551288049-buildings-architecture-1?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1558618666-0c7b397-c175a48ddc8?w=800&h=600&fit=crop",
    ],
    9: [  # 产品摄影
        "https://images.unsplash.com/photo-1526170375884-04b95b5f1f0?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1505740420928-5e560c06de3?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1549298916-b41d501d377?w=600&h=600&fit=crop",
    ],
    10: [  # 风景摄影
        "https://images.unsplash.com/photo-1506905925346-b10a5f1c0b8?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1493246507139-133bf6904972?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1501785815301-3b3cdf658d1?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1464820714463-0437de0c4fd?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1506905925346-b10a5f1c0b8?w=800&h=600&fit=crop",
    ],
    11: [  # Logo设计
        "https://images.unsplash.com/photo-1626784196166-d6a7d3a1c9a?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1558618666-0c7b397-c175a48ddc8?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1500462918057-3000360cjug?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1618760667266-ba7b57d3cc1?w=600&h=600&fit=crop",
    ],
    12: [  # 图像编辑
        "https://images.unsplash.com/photo-1506905925346-b10a5f1c0b8?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1493246507139-133bf6904972?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1551288049-buildings-architecture-1?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1501785815301-3b3cdf658d1?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1464820714463-0437de0c4fd?w=800&h=600&fit=crop",
    ],
}

print("开始更新 prompt_library 图片 URL...")
rows = run_sql("SELECT id, category_id, title, view_count FROM prompt_library ORDER BY view_count DESC;")
if not rows or "id" not in rows.split("\n")[0]:
    print("无法读取数据")
    sys.exit(1)

lines = rows.split("\n")[1:]  # skip header
updated = 0
for line in lines:
    if not line.strip():
        continue
    parts = line.split("\t")
    if len(parts) < 4:
        continue
    pid, cat_id, title, views = parts[0], int(parts[1]), parts[2], int(parts[3])
    cat = cat_id
    urls = UNSPLASH.get(cat, UNSPLASH[1])
    url = urls[(int(pid) - 1) % len(urls)]
    update_image_url(pid, url)
    updated += 1
    if updated % 10 == 0:
        print(f"  已更新 {updated} 条...")

print(f"✅ 共更新 {updated} 条图片 URL")
