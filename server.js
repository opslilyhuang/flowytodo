/**
 * Flowy Todo - 带账号体系的本地服务器
 * 支持用户注册、登录、数据隔离
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
// 固定 5999，避免与其它项目端口冲突
const PORT = process.env.FLOWY_PORT || 5999;
const USERS_FILE = path.join(__dirname, 'users.json');
const DATA_DIR = path.join(__dirname, 'user_data');

// 确保用户数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ========== 用户管理 ==========

// 读取所有用户
function readUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const raw = fs.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('读取用户文件失败:', e.message);
    }
    return {};
}

// 保存所有用户
function writeUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('写入用户文件失败:', e.message);
        return false;
    }
}

// 生成 session token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// 获取用户数据文件路径
function getUserDataFile(username) {
    // 安全的文件名处理
    const safeUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(DATA_DIR, `${safeUsername}.json`);
}

// 读取用户数据
function readUserData(username) {
    try {
        const dataFile = getUserDataFile(username);
        if (fs.existsSync(dataFile)) {
            const raw = fs.readFileSync(dataFile, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error(`读取用户 ${username} 数据失败:`, e.message);
    }
    return {};
}

// 保存用户数据
function writeUserData(username, data) {
    try {
        const dataFile = getUserDataFile(username);
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`写入用户 ${username} 数据失败:`, e.message);
        return false;
    }
}

// Session 存储（内存中，重启后清空）
const sessions = {};

// ========== 认证中间件 ==========

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ success: false, error: '未登录' });
    }

    const session = sessions[token];
    if (!session) {
        return res.status(401).json({ success: false, error: '登录已过期' });
    }

    // 检查 session 是否过期（24小时）
    if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
        delete sessions[token];
        return res.status(401).json({ success: false, error: '登录已过期' });
    }

    req.username = session.username;
    next();
}

// ========== 认证 API ==========

// 注册
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
        }

        if (username.length < 3) {
            return res.status(400).json({ success: false, error: '用户名至少3个字符' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: '密码至少6个字符' });
        }

        const users = readUsers();
        if (users[username]) {
            return res.status(400).json({ success: false, error: '用户名已存在' });
        }

        // 创建用户
        users[username] = {
            password: crypto.createHash('sha256').update(password).digest('hex'),
            createdAt: new Date().toISOString()
        };

        if (!writeUsers(users)) {
            return res.status(500).json({ success: false, error: '注册失败' });
        }

        // 创建用户数据文件
        writeUserData(username, {});

        res.json({ success: true, message: '注册成功' });
    } catch (e) {
        console.error('注册错误:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 登录
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
        }

        const users = readUsers();
        const user = users[username];

        if (!user) {
            return res.status(401).json({ success: false, error: '用户名或密码错误' });
        }

        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        if (user.password !== hashedPassword) {
            return res.status(401).json({ success: false, error: '用户名或密码错误' });
        }

        // 生成 session token
        const token = generateToken();
        sessions[token] = {
            username,
            createdAt: Date.now()
        };

        res.json({
            success: true,
            token,
            username,
            message: '登录成功'
        });
    } catch (e) {
        console.error('登录错误:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 登出
app.post('/api/auth/logout', authMiddleware, (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        delete sessions[token];
        res.json({ success: true, message: '登出成功' });
    } catch (e) {
        console.error('登出错误:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 检查登录状态
app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({
        success: true,
        username: req.username
    });
});

// ========== 数据 API（需要认证）==========

// 获取当前用户的所有数据
app.get('/api/data', authMiddleware, (req, res) => {
    try {
        const data = readUserData(req.username);
        res.json({ success: true, data });
    } catch (e) {
        console.error('GET /api/data:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 保存单条数据
app.post('/api/data/:key', authMiddleware, (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (value === undefined) {
            return res.status(400).json({ success: false, error: '缺少 value' });
        }

        const data = readUserData(req.username);
        data[key] = typeof value === 'string' ? value : JSON.stringify(value);

        if (!writeUserData(req.username, data)) {
            return res.status(500).json({ success: false, error: '保存失败' });
        }

        res.json({ success: true });
    } catch (e) {
        console.error('POST /api/data/:key:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 批量保存数据
app.post('/api/data/batch', authMiddleware, (req, res) => {
    try {
        const { data } = req.body;

        const userData = readUserData(req.username);
        for (const [key, value] of Object.entries(data)) {
            userData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }

        if (!writeUserData(req.username, userData)) {
            return res.status(500).json({ success: false, error: '批量保存失败' });
        }

        res.json({ success: true, count: Object.keys(data).length });
    } catch (e) {
        console.error('批量保存错误:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        usersFile: USERS_FILE,
        dataDir: DATA_DIR,
        activeSessions: Object.keys(sessions).length
    });
});

// 明确提供首页，避免静态路由或路径问题
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 静态文件（其他 js/css/图片等）
app.use(express.static(__dirname));

// 启动服务器
const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   Flowy Todo 服务器已启动                  ║
║   ✨ 支持多用户账号体系                     ║
║                                           ║
║   🌐 打开: http://localhost:${PORT}       ║
║   📁 用户数据: ${DATA_DIR}
║                                           ║
║   按 Ctrl+C 停止                           ║
╚═══════════════════════════════════════════╝`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ 端口 ${PORT} 已被占用。先结束占用进程：`);
        console.error(`   lsof -ti:${PORT} | xargs kill -9\n`);
    } else {
        console.error('服务器启动失败:', err);
    }
    process.exit(1);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    server.close();
    process.exit(0);
});
