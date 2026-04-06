const express = require('express');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } = require('docx');
const ExcelJS = require('exceljs');
const { getDB } = require('../database');
const { authMiddleware } = require('../auth');

const router = express.Router();

const typeLabels = { inst: '지시사항', rep: '보고사항', shared: '공유사항' };
const statusLabels = { pending: '진행중', done: '완료' };

// Word 다운로드
router.get('/word', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const { type } = req.query;
    let sql = `SELECT t.*, u1.name as from_name, u2.name as to_name
      FROM tasks t LEFT JOIN users u1 ON t.from_user_id = u1.id
      LEFT JOIN users u2 ON t.to_user_id = u2.id
      WHERE (t.from_user_id = $1 OR t.to_user_id = $2)`;
    const params = [req.user.id, req.user.id];
    if (type) { sql += ' AND t.type = $3'; params.push(type); }
    sql += ' ORDER BY t.created_at DESC';

    const tasksResult = await db.query(sql, params);
    const tasks = tasksResult.rows;
    const userResult = await db.query("SELECT name, role, dept FROM users WHERE id = $1", [req.user.id]);
    const userName = userResult.rows[0]?.name || '';
    const userRole = userResult.rows[0]?.role || '';

    const tableRows = [
      new TableRow({
        tableHeader: true,
        children: ['No', '유형', '제목', '내용', '발신', '수신', '상태', '마감일', '등록일'].map(text =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: 'Malgun Gothic' })], alignment: AlignmentType.CENTER })],
            shading: { fill: '2563EB', color: 'FFFFFF' },
            width: { size: text === '내용' ? 2000 : 800, type: WidthType.DXA }
          })
        )
      }),
      ...tasks.map((t, i) =>
        new TableRow({
          children: [
            String(i + 1), typeLabels[t.type] || t.type, t.title, t.content || '-',
            t.from_name || '-', t.to_name || '-', statusLabels[t.status],
            t.due_date || '-', (t.created_at ? new Date(t.created_at).toISOString().slice(0, 10) : '')
          ].map(text =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text, size: 16, font: 'Malgun Gothic' })], alignment: AlignmentType.CENTER })],
            })
          )
        })
      )
    ];

    const doc = new Document({
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'WORKHIVE 업무 보고서', bold: true, size: 32, font: 'Malgun Gothic', color: '2563EB' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: `작성자: ${userName} (${userRole})  |  출력일: ${new Date().toLocaleDateString('ko-KR')}`, size: 18, font: 'Malgun Gothic', color: '666666' })], alignment: AlignmentType.RIGHT, spacing: { after: 400 } }),
          new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ children: [new TextRun({ text: `총 ${tasks.length}건`, size: 16, font: 'Malgun Gothic', color: '999999' })], alignment: AlignmentType.RIGHT, spacing: { before: 200 } })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=WorkHive_Report.docx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Excel 다운로드
router.get('/excel', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const { type } = req.query;
    let sql = `SELECT t.*, u1.name as from_name, u2.name as to_name
      FROM tasks t LEFT JOIN users u1 ON t.from_user_id = u1.id
      LEFT JOIN users u2 ON t.to_user_id = u2.id
      WHERE (t.from_user_id = $1 OR t.to_user_id = $2)`;
    const params = [req.user.id, req.user.id];
    if (type) { sql += ' AND t.type = $3'; params.push(type); }
    sql += ' ORDER BY t.created_at DESC';

    const tasksResult = await db.query(sql, params);
    const tasks = tasksResult.rows;
    const userResult = await db.query("SELECT name, role FROM users WHERE id = $1", [req.user.id]);
    const userName = userResult.rows[0]?.name || '';

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('업무 보고서');

    sheet.mergeCells('A1:I1');
    sheet.getCell('A1').value = 'WORKHIVE 업무 보고서';
    sheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF2563EB' } };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 40;

    sheet.mergeCells('A2:I2');
    sheet.getCell('A2').value = `작성자: ${userName}  |  출력일: ${new Date().toLocaleDateString('ko-KR')}`;
    sheet.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };
    sheet.getCell('A2').alignment = { horizontal: 'right' };

    const headers = ['No', '유형', '제목', '내용', '발신', '수신', '상태', '마감일', '등록일'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    tasks.forEach((t, i) => {
      const row = sheet.addRow([
        i + 1, typeLabels[t.type] || t.type, t.title, t.content || '-',
        t.from_name || '-', t.to_name || '-', statusLabels[t.status],
        t.due_date || '-', t.created_at ? new Date(t.created_at).toISOString().slice(0, 10) : ''
      ]);
      row.eachCell(cell => {
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        cell.font = { size: 10 };
      });
    });

    sheet.columns = [
      { width: 5 }, { width: 10 }, { width: 20 }, { width: 30 },
      { width: 10 }, { width: 10 }, { width: 8 }, { width: 12 }, { width: 12 }
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=WorkHive_Report.xlsx`);
    await workbook.xlsx.write(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 달성률 보고서 (Excel)
router.get('/stats-excel', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const userResult = await db.query("SELECT name, role, dept FROM users WHERE id = $1", [req.user.id]);
    const userName = userResult.rows[0]?.name || '';
    const userRole = userResult.rows[0]?.role || '';

    const periods = [
      { label: '일간', filter: "AND t.created_at::date = CURRENT_DATE" },
      { label: '주간', filter: "AND t.created_at >= NOW() - INTERVAL '7 days'" },
      { label: '월간', filter: "AND t.created_at >= NOW() - INTERVAL '30 days'" }
    ];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('달성률 보고서');

    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'WORKHIVE 달성률 보고서';
    sheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF2563EB' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.getRow(1).height = 40;

    sheet.mergeCells('A2:D2');
    sheet.getCell('A2').value = `${userName} (${userRole})  |  ${new Date().toLocaleDateString('ko-KR')}`;
    sheet.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };
    sheet.getCell('A2').alignment = { horizontal: 'right' };

    let rowNum = 4;
    for (const p of periods) {
      sheet.mergeCells(`A${rowNum}:D${rowNum}`);
      sheet.getCell(`A${rowNum}`).value = `[ ${p.label} 달성률 ]`;
      sheet.getCell(`A${rowNum}`).font = { size: 12, bold: true };
      rowNum++;

      const hRow = sheet.addRow(['구분', '전체', '완료', '달성률']);
      hRow.eachCell(c => { c.font = { bold: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; });
      rowNum++;

      for (const [label, sql, paramCount] of [
        ['전체', `SELECT COUNT(*), SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) FROM tasks t WHERE (from_user_id=$1 OR to_user_id=$2) ${p.filter}`, 2],
        ['지시 수행', `SELECT COUNT(*), SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) FROM tasks t WHERE type='inst' AND to_user_id=$1 ${p.filter}`, 1],
        ['보고 제출', `SELECT COUNT(*), SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) FROM tasks t WHERE type='rep' AND from_user_id=$1 ${p.filter}`, 1]
      ]) {
        const params = paramCount === 2 ? [req.user.id, req.user.id] : [req.user.id];
        const r = await db.query(sql, params);
        const total = parseInt(r.rows[0]?.count) || 0;
        const done = parseInt(r.rows[0]?.sum) || 0;
        const rate = total > 0 ? Math.round((done / total) * 100) : 0;
        sheet.addRow([label, total, done, `${rate}%`]);
        rowNum++;
      }
      rowNum++;
    }

    sheet.columns = [{ width: 15 }, { width: 12 }, { width: 12 }, { width: 12 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=WorkHive_Stats.xlsx`);
    await workbook.xlsx.write(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
