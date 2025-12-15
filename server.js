// 生日祝福墙后端服务器
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 使用中间件
app.use(cors()); // 允许所有前端域名访问
app.use(express.json()); // 解析JSON格式的请求体

// 数据库文件路径
const dbPath = path.join(__dirname, 'birthday.db');

// 初始化数据库连接
let db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('已成功连接到SQLite数据库');
        // 创建祝福表（如果不存在）
        db.run(`CREATE TABLE IF NOT EXISTS blessings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            impression TEXT,
            blessing TEXT NOT NULL,
            time DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// ====================== API 接口开始 ======================

// 【健康检查】访问根路径返回欢迎信息
app.get('/', (req, res) => {
    res.json({ 
        message: '🎂 生日祝福墙后端服务正在运行！',
        endpoints: {
            getBlessings: 'GET /api/blessings',
            addBlessing: 'POST /api/blessings'
        }
    });
});

// 【接口1】获取所有祝福（按时间倒序，最新的在前面）
app.get('/api/blessings', (req, res) => {
    const sql = `SELECT id, name, impression, blessing, 
                strftime('%Y-%m-%d %H:%M', time) as time 
                FROM blessings ORDER BY time DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('获取祝福失败:', err.message);
            return res.status(500).json({ error: '获取数据失败' });
        }
        res.json({ 
            success: true,
            count: rows.length,
            blessings: rows 
        });
    });
});

// 【接口2】提交新祝福
app.post('/api/blessings', (req, res) => {
    const { name, impression, blessing } = req.body;
    
    // 简单验证
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: '请输入昵称' });
    }
    if (!blessing || blessing.trim() === '') {
        return res.status(400).json({ error: '请输入祝福内容' });
    }
    
    const sql = `INSERT INTO blessings (name, impression, blessing) VALUES (?, ?, ?)`;
    const params = [name.trim(), impression ? impression.trim() : '', blessing.trim()];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('提交祝福失败:', err.message);
            return res.status(500).json({ error: '提交失败，请重试' });
        }
        res.json({ 
            success: true, 
            message: '祝福提交成功！',
            id: this.lastID 
        });
    });
});

// 【接口3】获取祝福数量
app.get('/api/blessings/count', (req, res) => {
    db.get(`SELECT COUNT(*) as count FROM blessings`, (err, row) => {
        if (err) {
            return res.status(500).json({ error: '查询失败' });
        }
        res.json({ count: row.count });
    });
});

// ====================== API 接口结束 ======================

// 启动服务器
app.listen(PORT, () => {
    console.log(`✅ 生日祝福后端服务已启动！`);
    console.log(`📡 本地访问：http://localhost:${PORT}`);
    console.log(`📡 公网访问：取决于你的部署平台`);
});

// 处理进程退出，优雅关闭数据库连接
process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});