const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authMiddleware } = require('../auth');

const router = express.Router();

// 게시글 목록
router.get('/', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query(
    `SELECT p.*, u.name as user_name, u.role as user_role
     FROM board_posts p JOIN users u ON p.user_id = u.id
     ORDER BY p.pinned DESC, p.created_at DESC`
  );
  res.json(result.rows);
});

// 게시글 상세
router.get('/:id', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query(
    `SELECT p.*, u.name as user_name, u.role as user_role
     FROM board_posts p JOIN users u ON p.user_id = u.id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
  res.json(result.rows[0]);
});

// 게시글 등록
router.post('/', authMiddleware, async (req, res) => {
  const { title, content, pinned } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: '제목을 입력하세요' });

  const db = getDB();
  const id = uuidv4();
  await db.query(
    "INSERT INTO board_posts (id, title, content, user_id, pinned) VALUES ($1, $2, $3, $4, $5)",
    [id, title.trim(), content || '', req.user.id, pinned || false]
  );

  const userResult = await db.query("SELECT name, role FROM users WHERE id = $1", [req.user.id]);
  const u = userResult.rows[0] || {};

  res.status(201).json({ id, title: title.trim(), content, user_id: req.user.id, pinned: pinned || false, user_name: u.name, user_role: u.role });
});

// 게시글 수정 (작성자만)
router.put('/:id', authMiddleware, async (req, res) => {
  const db = getDB();
  const existing = await db.query("SELECT user_id FROM board_posts WHERE id = $1", [req.params.id]);
  if (existing.rows.length === 0) return res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
  if (existing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: '작성자만 수정할 수 있습니다' });

  const { title, content, pinned } = req.body;
  await db.query(
    "UPDATE board_posts SET title = $1, content = $2, pinned = $3, updated_at = NOW() WHERE id = $4",
    [title, content || '', pinned || false, req.params.id]
  );
  res.json({ success: true });
});

// 게시글 삭제 (작성자만)
router.delete('/:id', authMiddleware, async (req, res) => {
  const db = getDB();
  const existing = await db.query("SELECT user_id FROM board_posts WHERE id = $1", [req.params.id]);
  if (existing.rows.length === 0) return res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
  if (existing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: '작성자만 삭제할 수 있습니다' });

  await db.query("DELETE FROM board_posts WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
