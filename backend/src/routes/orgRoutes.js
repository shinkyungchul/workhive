const express = require('express');
const { getDB } = require('../database');
const { authMiddleware } = require('../auth');

const router = express.Router();

// 조직도 위치 조회
router.get('/positions', authMiddleware, async (req, res) => {
  const db = getDB();
  const result = await db.query("SELECT * FROM org_positions");
  const positions = {};
  result.rows.forEach(row => {
    positions[row.user_id] = { x: row.x, y: row.y };
  });
  res.json(positions);
});

// 조직도 위치 저장
router.put('/positions', authMiddleware, async (req, res) => {
  const db = getDB();
  const positions = req.body;
  for (const [userId, pos] of Object.entries(positions)) {
    await db.query(
      "INSERT INTO org_positions (user_id, x, y) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET x = $2, y = $3",
      [userId, pos.x, pos.y]
    );
  }
  res.json({ success: true });
});

module.exports = router;
