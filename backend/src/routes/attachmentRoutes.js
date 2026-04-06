const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDB, save } = require('../database');
const { authMiddleware } = require('../auth');

const router = express.Router();

// 업로드 디렉토리
const UPLOAD_DIR = process.env.UPLOAD_PATH || path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|hwp)$/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('허용되지 않는 파일 형식입니다'));
  }
});

function rowsToObjects(result) {
  if (!result.length) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

// 첨부파일 목록
router.get('/:taskId', authMiddleware, (req, res) => {
  const db = getDB();
  const result = db.exec(
    `SELECT a.*, u.name as user_name FROM attachments a
     JOIN users u ON a.user_id = u.id
     WHERE a.task_id = ? ORDER BY a.created_at ASC`,
    [req.params.taskId]
  );
  res.json(rowsToObjects(result));
});

// 파일 업로드
router.post('/:taskId', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일을 선택하세요' });

  const db = getDB();
  const id = uuidv4();
  db.run(
    "INSERT INTO attachments (id, task_id, user_id, filename, original_name, size) VALUES (?, ?, ?, ?, ?, ?)",
    [id, req.params.taskId, req.user.id, req.file.filename, req.file.originalname, req.file.size]
  );
  save();

  res.status(201).json({
    id, task_id: req.params.taskId, user_id: req.user.id,
    filename: req.file.filename, original_name: req.file.originalname, size: req.file.size
  });
});

// 파일 다운로드
router.get('/download/:filename', authMiddleware, (req, res) => {
  const db = getDB();
  const result = db.exec("SELECT original_name FROM attachments WHERE filename = ?", [req.params.filename]);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: '파일을 찾을 수 없습니다' });

  const originalName = result[0].values[0][0];
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '파일이 존재하지 않습니다' });

  res.download(filePath, originalName);
});

// 파일 삭제 (작성자만)
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const result = db.exec("SELECT user_id, filename FROM attachments WHERE id = ?", [req.params.id]);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: '파일을 찾을 수 없습니다' });
  if (result[0].values[0][0] !== req.user.id) return res.status(403).json({ error: '업로더만 삭제할 수 있습니다' });

  const filename = result[0].values[0][1];
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.run("DELETE FROM attachments WHERE id = ?", [req.params.id]);
  save();
  res.json({ success: true });
});

module.exports = router;
