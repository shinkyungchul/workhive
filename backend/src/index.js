const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');
const { initMailer } = require('./mailer');

const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const relationRoutes = require('./routes/relationRoutes');
const orgRoutes = require('./routes/orgRoutes');
const exportRoutes = require('./routes/exportRoutes');
const commentRoutes = require('./routes/commentRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const boardRoutes = require('./routes/boardRoutes');
const profileRoutes = require('./routes/profileRoutes');
const linkRoutes = require('./routes/linkRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API 라우트
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/relations', relationRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/links', linkRoutes);

// 프론트엔드 정적 파일 서빙 (빌드 후)
const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (require('fs').existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

async function start() {
  await initDB();
  initMailer();
  app.listen(PORT, () => {
    console.log(`WorkHive server running at http://localhost:${PORT}`);
  });
}

start().catch(console.error);
