const express = require('express');
const { getDB, save } = require('../database');
const { authMiddleware } = require('../auth');

const router = express.Router();

// 조직도 위치 조회
router.get('/positions', authMiddleware, (req, res) => {
  const db = getDB();
  const result = db.exec("SELECT * FROM org_positions");
  if (!result.length) return res.json({});
  const positions = {};
  result[0].values.forEach(([userId, x, y]) => {
    positions[userId] = { x, y };
  });
  res.json(positions);
});

// 조직도 위치 저장
router.put('/positions', authMiddleware, (req, res) => {
  const db = getDB();
  const positions = req.body; // { userId: { x, y }, ... }
  for (const [userId, pos] of Object.entries(positions)) {
    db.run("INSERT OR REPLACE INTO org_positions (user_id, x, y) VALUES (?, ?, ?)",
      [userId, pos.x, pos.y]);
  }
  save();
  res.json({ success: true });
});

module.exports = router;
