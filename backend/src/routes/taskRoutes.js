const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB, save } = require('../database');
const { authMiddleware } = require('../auth');
const { sendTaskNotification } = require('../mailer');

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

// 업무 목록 (내가 관련된 것만)
router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const { type, status } = req.query;
  let sql = `SELECT t.*, u1.name as from_name, u2.name as to_name
    FROM tasks t
    LEFT JOIN users u1 ON t.from_user_id = u1.id
    LEFT JOIN users u2 ON t.to_user_id = u2.id
    WHERE (t.from_user_id = ? OR t.to_user_id = ?)`;
  const params = [req.user.id, req.user.id];

  if (type) { sql += ' AND t.type = ?'; params.push(type); }
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  sql += ' ORDER BY t.created_at DESC';

  const result = db.exec(sql, params);
  res.json(rowsToObjects(result));
});

// 업무 등록
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { type, title, content, to_user_id, due_date } = req.body;
    if (!type || !title) return res.status(400).json({ error: '유형과 제목은 필수입니다' });

    const db = getDB();
    const id = uuidv4();
    db.run(
      "INSERT INTO tasks (id, type, title, content, from_user_id, to_user_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, type, title, content || '', req.user.id, to_user_id || null, due_date || null]
    );
    save();

    // 이메일 알림 발송
    if (to_user_id) {
      const toResult = db.exec("SELECT name, email FROM users WHERE id = ?", [to_user_id]);
      const fromResult = db.exec("SELECT name FROM users WHERE id = ?", [req.user.id]);
      if (toResult.length && toResult[0].values.length && fromResult.length) {
        const toUser = { name: toResult[0].values[0][0], email: toResult[0].values[0][1] };
        const fromName = fromResult[0].values[0][0];
        sendTaskNotification(toUser.email, toUser.name, fromName, { type, title, content, due_date });
      }
    }

    res.status(201).json({ id, type, title, content, from_user_id: req.user.id, to_user_id, due_date, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 업무 완료 처리
router.patch('/:id/done', authMiddleware, (req, res) => {
  const db = getDB();
  db.run("UPDATE tasks SET status = 'done', done_at = datetime('now','localtime') WHERE id = ?", [req.params.id]);
  save();
  res.json({ success: true });
});

// 업무 미완료로 되돌리기
router.patch('/:id/undone', authMiddleware, (req, res) => {
  const db = getDB();
  db.run("UPDATE tasks SET status = 'pending', done_at = NULL WHERE id = ?", [req.params.id]);
  save();
  res.json({ success: true });
});

// 업무 삭제 (작성자만)
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const result = db.exec("SELECT from_user_id FROM tasks WHERE id = ?", [req.params.id]);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: '업무를 찾을 수 없습니다' });
  if (result[0].values[0][0] !== req.user.id) return res.status(403).json({ error: '작성자만 삭제할 수 있습니다' });
  db.run("DELETE FROM tasks WHERE id = ?", [req.params.id]);
  save();
  res.json({ success: true });
});

// 달성률 통계
router.get('/stats', authMiddleware, (req, res) => {
  const db = getDB();
  const { period } = req.query; // daily, weekly, monthly
  let dateFilter = '';
  if (period === 'daily') dateFilter = "AND date(t.created_at) = date('now','localtime')";
  else if (period === 'weekly') dateFilter = "AND t.created_at >= datetime('now','localtime','-7 days')";
  else if (period === 'monthly') dateFilter = "AND t.created_at >= datetime('now','localtime','-30 days')";

  // 전체 달성률
  const totalResult = db.exec(`SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
    FROM tasks t WHERE (from_user_id = ? OR to_user_id = ?) ${dateFilter}`, [req.user.id, req.user.id]);

  // 지시 수행률 (나에게 온 지시)
  const instResult = db.exec(`SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
    FROM tasks t WHERE type='inst' AND to_user_id = ? ${dateFilter}`, [req.user.id]);

  // 보고 제출률 (내가 올린 보고)
  const repResult = db.exec(`SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
    FROM tasks t WHERE type='rep' AND from_user_id = ? ${dateFilter}`, [req.user.id]);

  function calcRate(r) {
    if (!r.length || !r[0].values.length) return { total: 0, done: 0, rate: 0 };
    const [total, done] = r[0].values[0];
    return { total: total || 0, done: done || 0, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  // 후임 달성 현황
  const juniors = db.exec(`SELECT u.id, u.name, u.role,
    COUNT(t.id) as total, SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) as done
    FROM relationships r
    JOIN users u ON r.junior_id = u.id
    LEFT JOIN tasks t ON (t.to_user_id = u.id AND t.type='inst' ${dateFilter})
    WHERE r.senior_id = ?
    GROUP BY u.id`, [req.user.id]);

  const juniorStats = rowsToObjects(juniors).map(j => ({
    ...j,
    rate: j.total > 0 ? Math.round((j.done / j.total) * 100) : 0
  }));

  // 최근 업무 6건
  const recent = db.exec(`SELECT t.*, u1.name as from_name, u2.name as to_name
    FROM tasks t
    LEFT JOIN users u1 ON t.from_user_id = u1.id
    LEFT JOIN users u2 ON t.to_user_id = u2.id
    WHERE (t.from_user_id = ? OR t.to_user_id = ?)
    ORDER BY t.created_at DESC LIMIT 6`, [req.user.id, req.user.id]);

  res.json({
    overall: calcRate(totalResult),
    instruction: calcRate(instResult),
    report: calcRate(repResult),
    juniorStats,
    recentTasks: rowsToObjects(recent)
  });
});

module.exports = router;
