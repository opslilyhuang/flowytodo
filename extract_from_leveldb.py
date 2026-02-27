#!/usr/bin/env python3
import os
import sys

# Chrome LevelDB 的 Local Storage 格式
# 需要使用 ldb 命令行工具

def extract_leveldb_data():
    import subprocess
    import json

    chrome_path = os.path.expanduser("~/Library/Application Support/Google/Chrome/Profile 5/Local Storage/leveldb")
    output_file = os.path.expanduser("~/Desktop/flowy-extracted.json")

    # 尝试使用 ldb 命令
    try:
        # 检查是否有 ldb 命令
        result = subprocess.run(['which', 'ldb'], capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ ldb 命令未安装")
            print("\n📦 安装方法: brew install leveldb")
            return False

        # 使用 ldb dump 导出所有数据
        print("📂 正在导出 LevelDB 数据...")
        result = subprocess.run(
            ['ldb', '--db=' + chrome_path, 'dump', '--hex'],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            print(f"❌ 导出失败: {result.stderr}")
            return False

        # 解析输出，提取 flowy 相关的数据
        data = {}
        lines = result.stdout.split('\n')
        current_key = None
        current_value = None

        for line in lines:
            if line.startswith('Key: '):
                current_key = line[5:].strip()
            elif line.startswith('Value: '):
                current_value = line[7:].strip()
                if current_key and current_value and 'flowy-' in current_key:
                    try:
                        # 尝试解析十六进制
                        value_bytes = bytes.fromhex(current_value)
                        data[current_key] = json.loads(value_bytes.decode('utf-8'))
                        print(f"✅ {current_key}: {len(data[current_key])} 条")
                    except:
                        try:
                            # 尝试直接解析
                            data[current_key] = json.loads(current_value)
                            print(f"✅ {current_key}: {len(data[current_key])} 条")
                        except:
                            print(f"⚠️ 无法解析 {current_key}")

        if data:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"\n✅ 成功恢复！")
            print(f"📁 文件保存到: {output_file}")
            return True
        else:
            print("❌ 没有找到 flowy 数据")
            return False

    except Exception as e:
        print(f"❌ 错误: {e}")
        return False

if __name__ == "__main__":
    extract_leveldb_data()
