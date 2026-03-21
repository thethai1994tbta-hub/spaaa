import PDFDocument from 'pdfkit';

export function exportPDF(filename, title, data) {
  const doc = new PDFDocument();
  const stream = require('fs').createWriteStream(filename);
  doc.pipe(stream);

  // Title
  doc.fontSize(20).text(title, { align: 'center' });
  doc.moveDown();

  // Date
  doc.fontSize(10).text('Ngay: ' + new Date().toLocaleDateString('vi-VN'), { align: 'right' });
  doc.moveDown();

  // Data
  if (Array.isArray(data) && data.length > 0) {
    const keys = Object.keys(data[0]);
    
    // Headers
    doc.fontSize(9).font('Helvetica-Bold');
    keys.forEach(key => {
      doc.text(key, { width: 80, continued: true });
    });
    doc.moveDown();

    // Rows
    doc.font('Helvetica');
    data.forEach(row => {
      keys.forEach(key => {
        doc.text(String(row[key] || ''), { width: 80, continued: true });
      });
      doc.moveDown();
    });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
