#!/usr/bin/env python3
"""批量更新 prompt_library 的 image_url 字段"""
import subprocess, sys

DB = "turing_drawing"
USER = "root"
PASS = "12345678"

colors = {
    1:  ("fbc2eb", "a6c1ee"),
    2:  ("667eea", "764ba2"),
    3:  ("f093fb", "f5576c"),
    4:  ("4facfe", "00f2fe"),
    5:  ("43e97b", "38f9d7"),
    6:  ("fa709a", "fee140"),
    7:  ("a18cd1", "fbc2eb"),
    8:  ("ffecd2", "fcb69f"),
    9:  ("a1c4fd", "c2e9fb"),
    10: ("89f7fe", "66a6ff"),
    11: ("f6d365", "fda085"),
    12: ("96fbc7", "f9f586"),
}

def run_sql(sql):
    r = subprocess.run(
        ["mysql", f"-u{USER}", f"-p{PASS}", DB, "-e", sql],
        capture_output=True, text=True
    )
    return r.returncode, r.stdout.strip(), r.stderr.strip()

rc, out, err = run_sql("SELECT id, category_id, title FROM prompt_library ORDER BY id;")
if rc != 0:
    print(f"查询失败: {err}")
    sys.exit(1)

lines = [l for l in out.split("\n")[1:] if l.strip()]
print(f"共 {len(lines)} 条数据，开始更新 image_url...")

updated = 0
for line in lines:
    parts = line.split("\t")
    if len(parts) < 3:
        continue
    pid = parts[0]
    cid = int(parts[1])
    title = parts[2]
    c1, c2 = colors.get(cid, ("cccccc", "999999"))
    # 使用固定占位图 URL（placehold.co 会被重定向，改用 lorem picsum）
    # 最终方案：使用 picsum.photos 稳定服务
    idx = (int(pid) % 50) + 1
    url = f"https://picsum.photos/id/{idx}/400/400"
    rc2, _, err2 = run_sql(f"UPDATE prompt_library SET image_url='{url}' WHERE id={pid};")
    if rc2 == 0:
        updated += 1
    if updated % 10 == 0:
        print(f"  已更新 {updated}/{len(lines)}...")

print(f"✅ 完成！共更新 {updated} 条 image_url")
