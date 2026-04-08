const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authMiddleware } = require('../auth');

const router = express.Router();

// 업로드 디렉토리
const UPLOAD_DIR = process.env.UPLOAD_PATH || path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 한글 파일명 디코딩 (multer는 latin1로 인코딩함)
function decodeFilename(name) {
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const decoded = decodeFilename(file.originalname);
    const ext = path.extname(decoded);
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const decoded = decodeFilename(file.originalname);
    const allowed = /\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|hwp)$/i;
    if (allowed.test(path.extname(decoded))) cb(null, true);
    else cb(new Error('허용되지 않는 파일 형식입니다'));
  }
});

// 파일 다운로드 (/:taskId 보다 먼저 등록해야 "download"가 taskId로 잡히지 않음)
router.get('/download/:filename', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query("SELECT original_name FROM attachments WHERE filename = $1", [req.params.filename]);
  if (result.rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다' });

  const originalName = result.rows[0].original_name;
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '파일이 존재하지 않습니다' });

  // 한글 파일명을 위한 Content-Disposition 헤더 직접 설정
  const encoded = encodeURIComponent(originalName).replace(/['()]/g, escape);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encoded}`);
  res.sendFile(filePath);
});

// 첨부파일 목록
router.get('/:taskId', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query(
    `SELECT a.*, u.name as user_name FROM attachments a
     JOIN users u ON a.user_id = u.id
     WHERE a.task_id = $1 ORDER BY a.created_at ASC`,
    [req.params.taskId]
  );
  res.json(result.rows);
});

// 파일 업로드
router.post('/:taskId', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일을 선택하세요' });

  const db = getDB();
  const id = uuidv4();
  const originalName = decodeFilename(req.file.originalname);
  await db.query(
    "INSERT INTO attachments (id, task_id, user_id, filename, original_name, size) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, req.params.taskId, req.user.id, req.file.filename, originalName, req.file.size]
  );

  res.status(201).json({
    id, task_id: req.params.taskId, user_id: req.user.id,
    filename: req.file.filename, original_name: originalName, size: req.file.size
  });
});

// 파일 삭제
router.delete('/:id', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query("SELECT user_id, filename FROM attachments WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: '파일을 찾을 수 없습니다' });
  if (result.rows[0].user_id !== req.user.id) return res.status(403).json({ error: '업로더만 삭제할 수 있습니다' });

  const filename = result.rows[0].filename;
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await db.query("DELETE FROM attachments WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
