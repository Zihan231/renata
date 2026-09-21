import ExcelJS from 'exceljs';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export const XLSX_PATH = path.resolve(process.env.XLSX_PATH || './data/participants.xlsx');

const COLUMNS = [
  { header: 'ID', key: 'id', width: 12 },
  { header: 'Date & Time', key: 'time', width: 22 },
  { header: 'Name', key: 'name', width: 28 },
  { header: 'Phone', key: 'phone', width: 20 },
  { header: 'Score (first try, /3)', key: 'score', width: 20 },
  { header: 'Total Attempts', key: 'attempts', width: 15 },
  { header: 'Status', key: 'status', width: 14 },
];

// Serialise all reads/writes so concurrent players never corrupt the file.
let queue = Promise.resolve();
const locked = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};


async function open() {
  const wb = new ExcelJS.Workbook();
  try {
    await fs.access(XLSX_PATH);
    await wb.xlsx.readFile(XLSX_PATH);
  } catch {
    await fs.mkdir(path.dirname(XLSX_PATH), { recursive: true });
  }
  let ws = wb.getWorksheet('Participants');
  if (!ws) {
    ws = wb.addWorksheet('Participants', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = COLUMNS;
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4FBF' } };
    head.alignment = { vertical: 'middle' };
    head.height = 24;
  } else {
    // ExcelJS doesn't restore column keys on read
    ws.columns = COLUMNS;
  }
  return { wb, ws };
}

export function addParticipant({ name, phone }) {
  return locked(async () => {
    const { wb, ws } = await open();
    const id = randomUUID().slice(0, 8);
    const row = ws.addRow({
      id,
      time: new Date().toLocaleString('en-GB', { hour12: false }),
      name,
      phone,
      score: '',
      attempts: '',
      status: 'Registered',
    });
    // values are stored as plain text (never formulas); '@' keeps a leading 0 / + in phone numbers
    row.getCell('phone').numFmt = '@';
    await wb.xlsx.writeFile(XLSX_PATH);
    return id;
  });
}

export function saveResult({ id, score, attempts }) {
  return locked(async () => {
    const { wb, ws } = await open();
    let found = false;
    ws.eachRow((row, n) => {
      if (n > 1 && String(row.getCell('id').value) === id) {
        row.getCell('score').value = score;
        row.getCell('attempts').value = attempts;
        row.getCell('status').value = 'Completed';
        found = true;
      }
    });
    if (found) await wb.xlsx.writeFile(XLSX_PATH);
    return found;
  });
}

export function readFileBuffer() {
  return locked(async () => {
    await open().then(({ wb }) => wb.xlsx.writeFile(XLSX_PATH)); // makes sure the file exists
    return fs.readFile(XLSX_PATH);
  });
}
