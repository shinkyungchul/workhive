const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authMiddleware } = require('../auth');

const router = express.Router();

// 댓글 목록
router.get('/:taskId', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query(
    `SELECT c.*, u.name as user_name, u.role as user_role
     FROM comments c JOIN users u ON c.user_id = u.id
     WHERE c.task_id = $1 ORDER BY c.created_at ASC`,
    [req.params.taskId]
  );
  res.json(result.rows);
});

// 댓글 등록
router.post('/:taskId', authMiddleware, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: '내용을 입력하세요' });

  const db = getDB();
  const id = uuidv4();
  await db.query(
    "INSERT INTO comments (id, task_id, user_id, content) VALUES ($1, $2, $3, $4)",
    [id, req.params.taskId, req.user.id, content.trim()]
  );

  const userResult = await db.query("SELECT name, role FROM users WHERE id = $1", [req.user.id]);
  const u = userResult.rows[0] || {};

  res.status(201).json({ id, task_id: req.params.taskId, user_id: req.user.id, content: content.trim(), user_name: u.name, user_role: u.role });
});

// 댓글 삭제
router.delete('/:id', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query("SELECT user_id FROM comments WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
  if (result.rows[0].user_id !== req.user.id) return res.status(403).json({ error: '작성자만 삭제할 수 있습니다' });
  await db.query("DELETE FROM comments WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
