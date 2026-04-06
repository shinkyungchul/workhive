const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { generateToken, authMiddleware } = require('../auth');

const router = express.Router();

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, dept } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: '이름, 이메일, 비밀번호는 필수입니다' });
    }
    const db = getDB();
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '이미 등록된 이메일입니다' });
    }
    const id = uuidv4();
    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (id, name, email, password, role, dept) VALUES ($1, $2, $3, $4, $5, $6)",
      [id, name, email, hashed, role || '사원', dept || '']
    );
    const token = generateToken({ id, email });
    res.status(201).json({ token, user: { id, name, email, role: role || '사원', dept: dept || '' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDB();
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }
    const token = generateToken({ id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, dept: user.dept } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 내 정보
router.get('/me', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query("SELECT id, name, email, role, dept, created_at FROM users WHERE id = $1", [req.user.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
  res.json(result.rows[0]);
});

// 전체 사용자 목록
router.get('/list', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query("SELECT id, name, email, role, dept FROM users ORDER BY name");
  res.json(result.rows);
});

module.exports = router;
