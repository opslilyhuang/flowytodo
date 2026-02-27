# Flowy Todo - 带后端数据库版本

## 🎉 已完成改造！

### 📊 架构变化

**之前：**
```
浏览器 → localStorage (容易丢失数据)
```

**现在：**
```
浏览器 → Node.js 后端 → SQLite 数据库 (永久保存)
```

---

## 🚀 使用方法

### 启动服务器

```bash
# 方法1：使用启动脚本
./start.sh

# 方法2：直接用 Node.js
node server.js
```

### 访问应用

打开浏览器访问：
```
http://localhost:5999
```

---

## ✨ 优势

1. **数据永久保存** - 存储在 `flowy-data.db` 文件中
2. **不会丢失** - 清理浏览器缓存不影响数据
3. **多设备安全** - 数据库文件可以备份和迁移
4. **自动保存** - 每次修改都会写入数据库
5. **降级兼容** - 如果后端不可用，会自动使用 localStorage

---

## 📁 文件说明

```
my-todo/
├── server.js              # Node.js 后端服务器
├── package.json           # 依赖配置
├── index.html             # 前端页面（已修改）
├── flowy-data.db          # SQLite 数据库（自动生成）
├── backups/               # 备份目录（自动生成）
└── start.sh               # 启动脚本
```

---

## 💾 数据备份

虽然数据库很安全，但建议定期备份：

### 方法1：使用导出功能
1. 打开 my-todo
2. 点击右上角 **"📥 导出"** 按钮
3. 下载备份文件

### 方法2：备份数据库文件
```bash
cp flowy-data.db flowy-data-backup-$(date +%Y%m%d).db
```

---

## 🔧 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite (sql.js)
- **前端**: 原生 HTML/CSS/JavaScript
- **API**: RESTful API

---

## ⚙️ 配置

### 修改端口
编辑 `server.js`：
```javascript
const PORT = process.env.FLOWY_PORT || 5999; // 或设置环境变量 FLOWY_PORT
```

编辑 `index.html` 中的 `API_PORT` / `API_BASE` 与端口一致（当前为 5999）。

---

## 🛠️ 故障排除

### 端口被占用
```
Error: listen EADDRINUSE: address already in use
```
**解决**: 修改端口号（见上方配置说明）

### 数据库损坏
删除 `flowy-data.db` 文件，服务器会自动创建新的数据库。

### 无法连接后端
1. 检查服务器是否运行
2. 检查端口是否正确
3. 查看浏览器控制台错误信息

---

## 🎯 与原版的区别

| 功能 | 原版（localStorage） | 新版（数据库） |
|------|---------------------|---------------|
| 数据持久性 | ❌ 容易丢失 | ✅ 永久保存 |
| 清理缓存 | ❌ 数据会丢失 | ✅ 不影响 |
| 换浏览器 | ❌ 数据不在 | ✅ 数据在 |
| 换电脑 | ❌ 数据不在 | ✅ 备份后可迁移 |
| 导入导出 | ✅ 支持 | ✅ 支持 |

---

## 📞 需要帮助？

如果遇到问题，检查：
1. 服务器是否正常运行
2. 浏览器控制台是否有错误
3. `flowy-data.db` 文件是否存在

---

**🎊 现在数据安全了！可以放心使用了！**
