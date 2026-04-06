const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authMiddleware } = require('../auth');
const { sendTaskNotification } = require('../mailer');

const router = express.Router();

// 업무 목록 (내가 관련된 것만)
router.get('/', authMiddleware, async (req, res) => {
  const db = getDB();
  const { type, status } = req.query;
  let sql = `SELECT t.*, u1.name as from_name, u2.name as to_name
    FROM tasks t
    LEFT JOIN users u1 ON t.from_user_id = u1.id
    LEFT JOIN users u2 ON t.to_user_id = u2.id
    WHERE (t.from_user_id = $1 OR t.to_user_id = $2)`;
  const params = [req.user.id, req.user.id];
  let paramIdx = 3;

  if (type) { sql += ` AND t.type = $${paramIdx}`; params.push(type); paramIdx++; }
  if (status) { sql += ` AND t.status = $${paramIdx}`; params.push(status); paramIdx++; }
  sql += ' ORDER BY t.created_at DESC';

  const result = await db.query(sql, params);
  res.json(result.rows);
});

// 업무 등록
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { type, title, content, to_user_id, due_date } = req.body;
    if (!type || !title) return res.status(400).json({ error: '유형과 제목은 필수입니다' });

    const db = getDB();
    const id = uuidv4();
    await db.query(
      "INSERT INTO tasks (id, type, title, content, from_user_id, to_user_id, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, type, title, content || '', req.user.id, to_user_id || null, due_date || null]
    );

    // 이메일 알림 발송
    if (to_user_id) {
      const toResult = await db.query("SELECT name, email FROM users WHERE id = $1", [to_user_id]);
      const fromResult = await db.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
      if (toResult.rows.length && fromResult.rows.length) {
        const toUser = toResult.rows[0];
        sendTaskNotification(toUser.email, toUser.name, fromResult.rows[0].name, { type, title, content, due_date });
      }
    }

    res.status(201).json({ id, type, title, content, from_user_id: req.user.id, to_user_id, due_date, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 업무 완료 처리
router.patch('/:id/done', authMiddleware, async (req, res) => {
  const db = getDB();
  await db.query("UPDATE tasks SET status = 'done', done_at = NOW() WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// 업무 미완료로 되돌리기
router.patch('/:id/undone', authMiddleware, async (req, res) => {
  const db = getDB();
  await db.query("UPDATE tasks SET status = 'pending', done_at = NULL WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// 업무 삭제 (작성자만)
router.delete('/:id', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query("SELECT from_user_id FROM tasks WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: '업무를 찾을 수 없습니다' });
  if (result.rows[0].from_user_id !== req.user.id) return res.status(403).json({ error: '작성자만 삭제할 수 있습니다' });
  await db.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// 달성률 통계
router.get('/stats', authMiddleware, async (req, res) => {
  const db = getDB();
  const { period } = req.query;
  let dateFilter = '';
  if (period === 'daily') dateFilter = "AND t.created_at::date = CURRENT_DATE";
  else if (period === 'weekly') dateFilter = "AND t.created_at >= NOW() - INTERVAL '7 days'";
  else if (period === 'monthly') dateFilter = "AND t.created_at >= NOW() - INTERVAL '30 days'";

  // 전체 달성률
  const totalResult = await db.query(
    `SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
     FROM tasks t WHERE (from_user_id = $1 OR to_user_id = $2) ${dateFilter}`,
    [req.user.id, req.user.id]
  );

  // 지시 수행률
  const instResult = await db.query(
    `SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
     FROM tasks t WHERE type='inst' AND to_user_id = $1 ${dateFilter}`,
    [req.user.id]
  );

  // 보고 제출률
  const repResult = await db.query(
    `SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
     FROM tasks t WHERE type='rep' AND from_user_id = $1 ${dateFilter}`,
    [req.user.id]
  );

  function calcRate(r) {
    const row = r.rows[0];
    const total = parseInt(row.total) || 0;
    const done = parseInt(row.done) || 0;
    return { total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  // 후임 달성 현황
  const juniors = await db.query(
    `SELECT u.id, u.name, u.role,
      COUNT(t.id) as total, SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) as done
     FROM relationships r
     JOIN users u ON r.junior_id = u.id
     LEFT JOIN tasks t ON (t.to_user_id = u.id AND t.type='inst' ${dateFilter})
     WHERE r.senior_id = $1
     GROUP BY u.id, u.name, u.role`,
    [req.user.id]
  );

  const juniorStats = juniors.rows.map(j => ({
    ...j,
    total: parseInt(j.total) || 0,
    done: parseInt(j.done) || 0,
    rate: parseInt(j.total) > 0 ? Math.round((parseInt(j.done) / parseInt(j.total)) * 100) : 0
  }));

  // 최근 업무 6건
  const recent = await db.query(
    `SELECT t.*, u1.name as from_name, u2.name as to_name
     FROM tasks t
     LEFT JOIN users u1 ON t.from_user_id = u1.id
     LEFT JOIN users u2 ON t.to_user_id = u2.id
     WHERE (t.from_user_id = $1 OR t.to_user_id = $2)
     ORDER BY t.created_at DESC LIMIT 6`,
    [req.user.id, req.user.id]
  );

  res.json({
    overall: calcRate(totalResult),
    instruction: calcRate(instResult),
    report: calcRate(repResult),
    juniorStats,
    recentTasks: recent.rows
  });
});

module.exports = router;
