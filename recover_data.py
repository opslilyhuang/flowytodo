#!/usr/bin/env python3
"""从 Chrome 各配置的 LevelDB 中尝试恢复 Flowy 数据（任务、便签等）"""
import json
import os
import glob

chrome_base = os.path.expanduser("~/Library/Application Support/Google/Chrome")
output_file = os.path.expanduser("~/Desktop/flowy-recovered.json")

FLOWY_KEYS = [
    'flowy-todos',
    'flowy-meetings',
    'flowy-memos',
    'flowy-tags',
    'flowy-projects',
    'flowy-ai-reminders',
    'flowy-section-collapsed'
]


def extract_from_leveldb_dir(leveldb_path, profile_name):
    """从单个 LevelDB 目录提取 flowy 数据"""
    data = {}
    ldb_glob = os.path.join(leveldb_path, "*.ldb")
    ldb_files = sorted(glob.glob(ldb_glob), key=os.path.getmtime, reverse=True)[:15]

    for ldb_file in ldb_files:
        try:
            with open(ldb_file, 'rb') as f:
                content = f.read()

            for key in FLOWY_KEYS:
                if key.encode() in content and key not in data:
                    key_bytes = key.encode()
                    idx = content.find(key_bytes)
                    if idx == -1:
                        continue
                    try:
                        start = idx + len(key_bytes) + 1
                        while start < len(content) and content[start] not in b'{[':
                            start += 1
                        if start >= len(content):
                            continue

                        bracket_count = 0
                        end = start
                        is_string = False
                        while end < len(content):
                            char = content[end:end+1]
                            if char == b'"':
                                if end == 0 or content[end-1:end] != b'\\':
                                    is_string = not is_string
                            elif not is_string:
                                if char in b'{[':
                                    bracket_count += 1
                                elif char in b'}]':
                                    bracket_count -= 1
                                    if bracket_count == 0:
                                        end += 1
                                        break
                            end += 1

                        json_str = content[start:end].decode('utf-8', errors='ignore')
                        parsed = json.loads(json_str)
                        if parsed:
                            data[key] = parsed
                            print(f"  ✅ [{profile_name}] {key}: {len(parsed)} 条")
                    except Exception:
                        pass
        except Exception as e:
            print(f"  ⚠️ 读取 {os.path.basename(ldb_file)} 失败: {e}")

    return data


def main():
    # 查找所有配置的 Local Storage/leveldb
    profiles_to_try = []
    if os.path.isdir(chrome_base):
        for name in os.listdir(chrome_base):
            if name in ('Default', 'System Profile') or name.startswith('Profile '):
                leveldb = os.path.join(chrome_base, name, "Local Storage", "leveldb")
                if os.path.isdir(leveldb):
                    profiles_to_try.append((name, leveldb))

    if not profiles_to_try:
        print("❌ 未找到 Chrome Local Storage 目录")
        return

    print(f"🔍 将扫描 {len(profiles_to_try)} 个 Chrome 配置: {[p[0] for p in profiles_to_try]}\n")

    merged = {}
    source_profile = None

    for profile_name, leveldb_path in profiles_to_try:
        print(f"📂 {profile_name} ...")
        found = extract_from_leveldb_dir(leveldb_path, profile_name)
        for k, v in found.items():
            if k not in merged or (isinstance(v, list) and len(v) > len(merged.get(k, []))):
                merged[k] = v
                source_profile = profile_name
        if found:
            print(f"    本配置找到 {len(found)} 类数据")
        print()

    if merged:
        backup = {
            "version": "1.0",
            "source": f"Chrome 硬盘恢复 (来自: {source_profile})",
            "exportDate": __import__('datetime').datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            "data": merged
        }
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(backup, f, ensure_ascii=False, indent=2)

        print("✅ 成功从硬盘恢复数据！")
        print(f"📁 已保存: {output_file}")
        print("\n📊 恢复内容:")
        for key, value in merged.items():
            n = len(value) if isinstance(value, (list, dict)) else 1
            print(f"   - {key}: {n} 条")
        print("\n👉 请打开 Flowy Todo 页面，用「导入」选择该文件恢复。")
    else:
        print("❌ 在所有 Chrome 配置中均未找到 flowy 数据")
        print("\n可能原因：")
        print("  - 数据只存在内存里，从未写入当前配置的 LevelDB")
        print("  - 用不同网址/方式打开过应用（file:// 和 http:// 的 localStorage 不同）")
        print("  - 曾清理过浏览器数据")
        with open(output_file, 'w') as f:
            f.write("{}")


if __name__ == "__main__":
    main()
