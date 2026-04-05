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

// 관계 목록
router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const result = db.exec(`SELECT r.*, s.name as senior_name, s.role as senior_role,
    j.name as junior_name, j.role as junior_role
    FROM relationships r
    JOIN users s ON r.senior_id = s.id
    JOIN users j ON r.junior_id = j.id
    ORDER BY s.name`);
  res.json(rowsToObjects(result));
});

// 내 선임 목록
router.get('/seniors', authMiddleware, (req, res) => {
  const db = getDB();
  const result = db.exec(`SELECT u.id, u.name, u.email, u.role, u.dept
    FROM relationships r JOIN users u ON r.senior_id = u.id
    WHERE r.junior_id = ?`, [req.user.id]);
  res.json(rowsToObjects(result));
});

// 내 후임 목록
router.get('/juniors', authMiddleware, (req, res) => {
  const db = getDB();
  const result = db.exec(`SELECT u.id, u.name, u.email, u.role, u.dept
    FROM relationships r JOIN users u ON r.junior_id = u.id
    WHERE r.senior_id = ?`, [req.user.id]);
  res.json(rowsToObjects(result));
});

// 관계 추가
router.post('/', authMiddleware, (req, res) => {
  try {
    const { senior_id, junior_id } = req.body;
    if (!senior_id || !junior_id) return res.status(400).json({ error: '선임/후임 ID는 필수입니다' });
    if (senior_id === junior_id) return res.status(400).json({ error: '자기 자신과 관계를 맺을 수 없습니다' });

    const db = getDB();
    const id = uuidv4();
    db.run("INSERT OR IGNORE INTO relationships (id, senior_id, junior_id) VALUES (?, ?, ?)",
      [id, senior_id, junior_id]);
    save();
    res.status(201).json({ id, senior_id, junior_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 관계 삭제
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  db.run("DELETE FROM relationships WHERE id = ?", [req.params.id]);
  save();
  res.json({ success: true });
});

module.exports = router;
