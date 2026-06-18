#!/usr/bin/env python3
"""验证导入的提示词"""
import mysql.connector

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'passwd': '12345678',
    'database': 'turing_drawing',
    'charset': 'utf8mb4'
}

def verify():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    # 查询总数
    cursor.execute("SELECT COUNT(*) as cnt FROM prompt_library WHERE source='awesome-gpt-image-2'")
    result = cursor.fetchone()
    print(f"awesome-gpt-image-2 提示词总数: {result['cnt']}")
    
    # 查看前5条
    cursor.execute("""
        SELECT id, title, LEFT(prompt_text, 100) as prompt_preview, 
               CHAR_LENGTH(prompt_text) as prompt_len
        FROM prompt_library 
        WHERE source='awesome-gpt-image-2' 
        ORDER BY id 
        LIMIT 5
    """)
    
    print("\n前5条提示词预览:")
    for row in cursor.fetchall():
        print(f"\n--- ID: {row['id']} ---")
        print(f"标题: {row['title']}")
        print(f"提示词长度: {row['prompt_len']}")
        print(f"内容: {row['prompt_preview']}...")
    
    cursor.close()
    conn.close()

if __name__ == '__main__':
    verify()