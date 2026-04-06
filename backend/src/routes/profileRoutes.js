const express = require('express');
const bcrypt = require('bcryptjs');
const { getDB } = require('../database');
const { authMiddleware } = require('../auth');

const router = express.Router();

// 프로필 수정 (이메일, 비밀번호, 이름, 부서)
router.put('/', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const { name, email, dept, currentPassword, newPassword } = req.body;

    // 현재 사용자 조회
    const userResult = await db.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    const user = userResult.rows[0];

    // 비밀번호 변경 시 현재 비밀번호 확인
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: '현재 비밀번호를 입력하세요' });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다' });
      const hashed = await bcrypt.hash(newPassword, 10);
      await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, req.user.id]);
    }

    // 이메일 변경 시 중복 확인
    if (email && email !== user.email) {
      const existing = await db.query("SELECT id FROM users WHERE email = $1 AND id != $2", [email, req.user.id]);
      if (existing.rows.length > 0) return res.status(409).json({ error: '이미 사용 중인 이메일입니다' });
      await db.query("UPDATE users SET email = $1 WHERE id = $2", [email, req.user.id]);
    }

    // 이름, 부서 변경
    if (name) await db.query("UPDATE users SET name = $1 WHERE id = $2", [name, req.user.id]);
    if (dept !== undefined) await db.query("UPDATE users SET dept = $1 WHERE id = $2", [dept, req.user.id]);

    // 최신 정보 반환
    const updated = await db.query("SELECT id, name, email, role, dept FROM users WHERE id = $1", [req.user.id]);
    res.json({ success: true, user: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
