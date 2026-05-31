const express = require('express');
const cors = require('cors');
const sqlite3 = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const db = sqlite3('./sound_config.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS sound_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source1_x REAL NOT NULL,
    source1_y REAL NOT NULL,
    source1_frequency REAL NOT NULL,
    source1_amplitude REAL NOT NULL,
    source2_x REAL NOT NULL,
    source2_y REAL NOT NULL,
    source2_frequency REAL NOT NULL,
    source2_amplitude REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 500 ? 'error' : 'fail';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const successResponse = (res, data, message = 'success', statusCode = 200) => {
  res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
};

const notFoundHandler = (req, res, next) => {
  next(new AppError(`找不到 ${req.originalUrl} 这个路由`, 404));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    if (err.isOperational) {
      res.status(statusCode).json({
        status,
        message: err.message
      });
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: '服务器内部错误'
      });
    }
  }
};

const validateConfig = (req, res, next) => {
  const { name, source1_x, source1_y, source1_frequency, source1_amplitude, source2_x, source2_y, source2_frequency, source2_amplitude } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return next(new AppError('配置名称不能为空', 400));
  }

  const requiredFields = {
    source1_x, source1_y, source1_frequency, source1_amplitude,
    source2_x, source2_y, source2_frequency, source2_amplitude
  };

  for (const [field, value] of Object.entries(requiredFields)) {
    if (value === undefined || value === null || isNaN(value)) {
      return next(new AppError(`${field} 必须是有效的数字`, 400));
    }
  }

  if (source1_frequency < 20 || source1_frequency > 20000) {
    return next(new AppError('声源1频率必须在20-20000Hz范围内', 400));
  }

  if (source2_frequency < 20 || source2_frequency > 20000) {
    return next(new AppError('声源2频率必须在20-20000Hz范围内', 400));
  }

  if (source1_amplitude < 0 || source1_amplitude > 10) {
    return next(new AppError('声源1振幅必须在0-10范围内', 400));
  }

  if (source2_amplitude < 0 || source2_amplitude > 10) {
    return next(new AppError('声源2振幅必须在0-10范围内', 400));
  }

  next();
};

app.get('/api/health', (req, res) => {
  successResponse(res, {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected'
  }, '服务运行正常');
});

app.get('/api/configs', catchAsync(async (req, res, next) => {
  const configs = db.prepare('SELECT * FROM sound_configs ORDER BY created_at DESC').all();
  successResponse(res, {
    count: configs.length,
    configs
  }, '获取配置列表成功');
}));

app.get('/api/configs/:id', catchAsync(async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return next(new AppError('无效的配置ID', 400));
  }

  const config = db.prepare('SELECT * FROM sound_configs WHERE id = ?').get(id);
  if (!config) {
    return next(new AppError('找不到该配置', 404));
  }
  successResponse(res, { config }, '获取配置成功');
}));

app.post('/api/configs', validateConfig, catchAsync(async (req, res, next) => {
  const { name, source1_x, source1_y, source1_frequency, source1_amplitude, source2_x, source2_y, source2_frequency, source2_amplitude } = req.body;

  const stmt = db.prepare(`
    INSERT INTO sound_configs (name, source1_x, source1_y, source1_frequency, source1_amplitude, source2_x, source2_y, source2_frequency, source2_amplitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(name, source1_x, source1_y, source1_frequency, source1_amplitude, source2_x, source2_y, source2_frequency, source2_amplitude);

  successResponse(res, {
    id: result.lastInsertRowid,
    ...req.body
  }, '配置保存成功', 201);
}));

app.put('/api/configs/:id', validateConfig, catchAsync(async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return next(new AppError('无效的配置ID', 400));
  }

  const { name, source1_x, source1_y, source1_frequency, source1_amplitude, source2_x, source2_y, source2_frequency, source2_amplitude } = req.body;

  const stmt = db.prepare(`
    UPDATE sound_configs 
    SET name = ?, source1_x = ?, source1_y = ?, source1_frequency = ?, source1_amplitude = ?, source2_x = ?, source2_y = ?, source2_frequency = ?, source2_amplitude = ?
    WHERE id = ?
  `);

  const result = stmt.run(name, source1_x, source1_y, source1_frequency, source1_amplitude, source2_x, source2_y, source2_frequency, source2_amplitude, id);

  if (result.changes === 0) {
    return next(new AppError('找不到该配置', 404));
  }

  successResponse(res, { id, ...req.body }, '配置更新成功');
}));

app.delete('/api/configs/:id', catchAsync(async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return next(new AppError('无效的配置ID', 400));
  }

  const stmt = db.prepare('DELETE FROM sound_configs WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes === 0) {
    return next(new AppError('找不到该配置', 404));
  }

  successResponse(res, null, '配置删除成功', 204);
}));

app.use(notFoundHandler);
app.use(errorHandler);

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION! 💥 关闭服务器...');
  console.error(err.name, err.message);
  process.exit(1);
});

process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION! 💥 关闭服务器...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎵 声音干涉图案合成器 API 服务器已启动                  ║
║                                                           ║
║   📍 地址: http://localhost:${PORT}                        ║
║   🏥 健康检查: http://localhost:${PORT}/api/health          ║
║   📚 API 前缀: /api/configs                                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
