const nodemailer = require('nodemailer');

// SMTP 설정 — 실제 사용 시 환경변수로 교체
let transporterConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};

let transporter = null;

function initMailer() {
  if (transporterConfig.auth.user && transporterConfig.auth.pass) {
    transporter = nodemailer.createTransport(transporterConfig);
    console.log('Mailer initialized with', transporterConfig.auth.user);
  } else {
    console.log('Mailer not configured (set SMTP_USER and SMTP_PASS)');
  }
}

async function sendTaskNotification(toEmail, toName, fromName, task) {
  if (!transporter) {
    console.log(`[Mail skip] No SMTP config. Would send to ${toEmail}`);
    return false;
  }

  const typeLabels = { inst: '지시사항', rep: '보고사항', shared: '공유사항' };
  const typeLabel = typeLabels[task.type] || task.type;

  const mailOptions = {
    from: `"WorkHive" <${transporterConfig.auth.user}>`,
    to: toEmail,
    subject: `[WorkHive] 새 ${typeLabel}: ${task.title}`,
    html: `
      <div style="font-family:'Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <div style="background:#2563eb;color:#fff;padding:20px;text-align:center;">
          <h1 style="margin:0;font-size:20px;">WORKHIVE</h1>
          <p style="margin:4px 0 0;font-size:13px;">업무 협업 관리 플랫폼</p>
        </div>
        <div style="padding:24px;">
          <p style="color:#374151;font-size:15px;"><b>${toName}</b>님, 새로운 <b>${typeLabel}</b>이 등록되었습니다.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;width:80px;">유형</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${typeLabel}</td></tr>
            <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;">제목</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${task.title}</td></tr>
            <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;">내용</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${task.content || '-'}</td></tr>
            <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;">발신자</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${fromName}</td></tr>
            <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;">마감일</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${task.due_date || '없음'}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px;">WorkHive에 로그인하여 확인해주세요.</p>
        </div>
        <div style="background:#f8fafc;padding:12px;text-align:center;font-size:12px;color:#9ca3af;">
          &copy; 2026 WorkHive. All rights reserved.
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Mail] Sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error('[Mail Error]', err.message);
    return false;
  }
}

module.exports = { initMailer, sendTaskNotification };
