const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authMiddleware } = require('../auth');

const router = express.Router();

// 관계 목록
router.get('/', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query(
    `SELECT r.*, s.name as senior_name, s.role as senior_role,
      j.name as junior_name, j.role as junior_role
     FROM relationships r
     JOIN users s ON r.senior_id = s.id
     JOIN users j ON r.junior_id = j.id
     ORDER BY s.name`
  );
  res.json(result.rows);
});

// 내 선임 목록
router.get('/seniors', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.dept
     FROM relationships r JOIN users u ON r.senior_id = u.id
     WHERE r.junior_id = $1`,
    [req.user.id]
  );
  res.json(result.rows);
});

// 내 후임 목록
router.get('/juniors', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.dept
     FROM relationships r JOIN users u ON r.junior_id = u.id
     WHERE r.senior_id = $1`,
    [req.user.id]
  );
  res.json(result.rows);
});

// 관계 추가
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { senior_id, junior_id } = req.body;
    if (!senior_id || !junior_id) return res.status(400).json({ error: '선임/후임 ID는 필수입니다' });
    if (senior_id === junior_id) return res.status(400).json({ error: '자기 자신과 관계를 맺을 수 없습니다' });

    const db = getDB();
    const id = uuidv4();
    await db.query(
      "INSERT INTO relationships (id, senior_id, junior_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [id, senior_id, junior_id]
    );
    res.status(201).json({ id, senior_id, junior_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 관계 삭제
router.delete('/:id', authMiddleware, async (req, res) => {
  const db = getDB();
  await db.query("DELETE FROM relationships WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
