const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authMiddleware } = require('../auth');

const router = express.Router();

// 링크 목록
router.get('/', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query(
    `SELECT l.*, u.name as user_name FROM links l
     JOIN users u ON l.user_id = u.id
     ORDER BY l.created_at DESC`
  );
  res.json(result.rows);
});

// 링크 등록
router.post('/', authMiddleware, async (req, res) => {
  const { title, url, description } = req.body;
  if (!title || !url) return res.status(400).json({ error: '제목과 URL은 필수입니다' });

  const db = getDB();
  const id = uuidv4();
  await db.query(
    "INSERT INTO links (id, title, url, description, user_id) VALUES ($1, $2, $3, $4, $5)",
    [id, title.trim(), url.trim(), description || '', req.user.id]
  );

  res.status(201).json({ id, title, url, description, user_id: req.user.id });
});

// 링크 수정 (작성자만)
router.put('/:id', authMiddleware, async (req, res) => {
  const db = getDB();
  const existing = await db.query("SELECT user_id FROM links WHERE id = $1", [req.params.id]);
  if (existing.rows.length === 0) return res.status(404).json({ error: '링크를 찾을 수 없습니다' });
  if (existing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: '작성자만 수정할 수 있습니다' });

  const { title, url, description } = req.body;
  await db.query(
    "UPDATE links SET title = $1, url = $2, description = $3 WHERE id = $4",
    [title, url, description || '', req.params.id]
  );
  res.json({ success: true });
});

// 링크 삭제 (작성자만)
router.delete('/:id', authMiddleware, async (req, res) => {
  const db = getDB();
  const existing = await db.query("SELECT user_id FROM links WHERE id = $1", [req.params.id]);
  if (existing.rows.length === 0) return res.status(404).json({ error: '링크를 찾을 수 없습니다' });
  if (existing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: '작성자만 삭제할 수 있습니다' });

  await db.query("DELETE FROM links WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
