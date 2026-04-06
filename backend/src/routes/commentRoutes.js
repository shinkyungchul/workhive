const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB, save } = require('../database');
const { authMiddleware } = require('../auth');

const router = express.Router();

function rowsToObjects(result) {
  if (!result.length) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

// 댓글 목록
router.get('/:taskId', authMiddleware, (req, res) => {
  const db = getDB();
  const result = db.exec(
    `SELECT c.*, u.name as user_name, u.role as user_role
     FROM comments c JOIN users u ON c.user_id = u.id
     WHERE c.task_id = ? ORDER BY c.created_at ASC`,
    [req.params.taskId]
  );
  res.json(rowsToObjects(result));
});

// 댓글 등록
router.post('/:taskId', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: '내용을 입력하세요' });

  const db = getDB();
  const id = uuidv4();
  db.run(
    "INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)",
    [id, req.params.taskId, req.user.id, content.trim()]
  );
  save();

  const userResult = db.exec("SELECT name, role FROM users WHERE id = ?", [req.user.id]);
  const userName = userResult.length ? userResult[0].values[0][0] : '';
  const userRole = userResult.length ? userResult[0].values[0][1] : '';

  res.status(201).json({ id, task_id: req.params.taskId, user_id: req.user.id, content: content.trim(), user_name: userName, user_role: userRole });
});

// 댓글 삭제 (작성자만)
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const result = db.exec("SELECT user_id FROM comments WHERE id = ?", [req.params.id]);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
  if (result[0].values[0][0] !== req.user.id) return res.status(403).json({ error: '작성자만 삭제할 수 있습니다' });
  db.run("DELETE FROM comments WHERE id = ?", [req.params.id]);
  save();
  res.json({ success: true });
});

module.exports = router;
