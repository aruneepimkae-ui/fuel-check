import { BookRecord, BankRecord } from '../types';

export const parseCSV = (content: string): string[][] => {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  const result: string[][] = [];

  for (const line of lines) {
    const row: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    row.push(currentField);
    result.push(row);
  }
  return result;
};

export const parseBookData = (csvContent: string): BookRecord[] => {
  const rows = parseCSV(csvContent);
  // Assume header is first row
  const dataRows = rows.slice(1);
  
  return dataRows.map((row, index) => {
    // Handling cases where row might be empty
    if (row.length < 4) return null;

    const rawAmount = row[3];
    // Remove quotes and commas to parse number
    const cleanAmount = parseFloat(rawAmount.replace(/["',]/g, ''));

    return {
      id: `book-${index}`,
      document_no: row[0],
      posting_date: row[1],
      description: row[2].trim(), // This is our Invoice Number
      amount: isNaN(cleanAmount) ? 0 : cleanAmount,
      original_amount_string: row[3]
    };
  }).filter(item => item !== null) as BookRecord[];
};

export const parseBankData = (csvContent: string): BankRecord[] => {
  const rows = parseCSV(csvContent);
  const dataRows = rows.slice(1);

  return dataRows.map((row, index) => {
    if (row.length < 15) return null;

    const rawAmount = row[10]; // total_amount
    const cleanAmount = parseFloat(rawAmount.replace(/["',]/g, ''));

    return {
      id: `bank-${index}`,
      account_no: row[0],
      transaction_date: row[2],
      time: row[3],
      invoice_number: row[4].trim(),
      fuel_brand: row[14],
      total_amount: isNaN(cleanAmount) ? 0 : cleanAmount,
    };
  }).filter(item => item !== null) as BankRecord[];
};
