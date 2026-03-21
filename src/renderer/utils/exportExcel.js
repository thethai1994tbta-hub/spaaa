import XLSX from 'xlsx';

export function exportExcel(filename, sheetName, data) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Sheet1');
  XLSX.writeFile(workbook, filename);
}
