/// <reference lib="webworker" />
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const ctx: Worker = self as any;

ctx.onmessage = async (e) => {
  const { file, type } = e.data;

  try {
    let data: any[][] = [];

    if (type === 'excel') {
      const reader = new FileReaderSync();
      const bstr = reader.readAsBinaryString(file);
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    } else if (type === 'csv') {
      const text = await file.text();
      const results = Papa.parse(text, { header: false, skipEmptyLines: true });
      data = results.data as any[][];
    }

    // Sanitization & Rounding
    const sanitizedData = data.map(row => 
      row.map(cell => {
        const num = parseFloat(cell);
        if (!isNaN(num)) {
          // Smart rounding to 2 decimal places
          return Math.round((num + Number.EPSILON) * 100) / 100;
        }
        return cell;
      })
    );

    ctx.postMessage({ success: true, data: sanitizedData });
  } catch (error: any) {
    ctx.postMessage({ success: false, error: error.message });
  }
};
