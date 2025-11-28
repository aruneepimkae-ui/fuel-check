import { BookRecord, BankRecord, ReconResult, MatchStatus } from '../types';

// Helper to parse "d/m/yyyy" to Date object
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  // Month is 0-indexed in JS
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

// Calculate days difference between two dates
const getDaysDiff = (d1: string, d2: string): number => {
  const date1 = parseDate(d1);
  const date2 = parseDate(d2);
  if (!date1 || !date2) return 999;
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

export const reconcileData = (bookData: BookRecord[], bankData: BankRecord[]): ReconResult[] => {
  const results: ReconResult[] = [];
  const usedBankIds = new Set<string>();
  const usedBookIds = new Set<string>();

  // 1. MATCH BY INVOICE NUMBER (Primary Key) -> Finds Amount Mismatches & Exact Matches
  bookData.forEach(book => {
    // Find bank record with same invoice number that hasn't been used
    const bank = bankData.find(b => b.invoice_number === book.description && !usedBankIds.has(b.id));

    if (bank) {
      usedBookIds.add(book.id);
      usedBankIds.add(bank.id);

      const diff = Math.abs(book.amount - bank.total_amount);
      const isExactMatch = diff < 0.01;

      if (isExactMatch) {
        results.push({
          bookRecord: book,
          bankRecord: bank,
          status: MatchStatus.MATCHED,
          confidence: 100,
          difference: 0
        });
      } else {
        // Amount Mismatch - Detect Anomaly Type
        let anomaly: 'Transposition' | 'Typo' | 'None' = 'Typo';
        
        // Check for Transposition (Divisible by 9 rule heuristic for integer diffs)
        const cleanDiff = Math.round(diff * 100);
        if (cleanDiff > 0 && cleanDiff % 9 === 0) {
          anomaly = 'Transposition';
        }

        results.push({
          bookRecord: book,
          bankRecord: bank,
          status: MatchStatus.AMOUNT_MISMATCH,
          confidence: 90, 
          difference: diff,
          anomalyType: anomaly,
          suggestedFix: `ปรับยอดเงินใน Book จาก ${book.amount.toLocaleString('en-US', {minimumFractionDigits: 2})} เป็น ${bank.total_amount.toLocaleString('en-US', {minimumFractionDigits: 2})} (Invoice ตรงกันแต่ายอดเงินไม่ตรง)`
        });
      }
    }
  });

  // 2. MATCH BY AMOUNT (Secondary Key) -> Finds Wrong Invoice Numbers
  bookData.forEach(book => {
    if (usedBookIds.has(book.id)) return;

    // Find bank records with same amount (Exact Match)
    let candidates = bankData.filter(b => !usedBankIds.has(b.id) && Math.abs(b.total_amount - book.amount) < 0.01);

    if (candidates.length > 0) {
      let bestMatch: BankRecord | null = null;

      if (candidates.length === 1) {
        bestMatch = candidates[0];
      } else {
        // If multiple candidates have the same amount, pick the one closest in date
        // Sort by days difference
        candidates.sort((a, b) => {
          const diffA = getDaysDiff(book.posting_date, a.transaction_date);
          const diffB = getDaysDiff(book.posting_date, b.transaction_date);
          return diffA - diffB;
        });
        // Pick the closest one
        bestMatch = candidates[0];
      }

      if (bestMatch) {
        usedBookIds.add(book.id);
        usedBankIds.add(bestMatch.id);

        results.push({
          bookRecord: book,
          bankRecord: bestMatch,
          status: MatchStatus.ID_MISMATCH,
          confidence: 75, // Lower confidence than invoice match
          difference: 0,
          anomalyType: 'Wrong Invoice',
          suggestedFix: `แก้ไขเลขที่ Invoice ใน Book จาก "${book.description}" เป็น "${bestMatch.invoice_number}" (ยอดเงินตรงกัน ${bestMatch.total_amount.toLocaleString('en-US', {minimumFractionDigits: 2})})`
        });
      }
    }
  });

  // 3. REMAINING UNMATCHED
  bookData.forEach(book => {
    if (!usedBookIds.has(book.id)) {
      results.push({
        bookRecord: book,
        bankRecord: null,
        status: MatchStatus.MISSING_IN_BANK,
        confidence: 0,
        suggestedFix: 'ตรวจสอบเอกสารต้นฉบับ: ไม่พบข้อมูลใน Bank ที่ Invoice หรือ ยอดเงิน ตรงกัน'
      });
    }
  });

  bankData.forEach(bank => {
    if (!usedBankIds.has(bank.id)) {
      results.push({
        bookRecord: null,
        bankRecord: bank,
        status: MatchStatus.MISSING_IN_BOOK,
        confidence: 0,
        suggestedFix: `บันทึกรายการตกหล่นเพิ่มใน Book: ยอด ${bank.total_amount.toLocaleString('en-US', {minimumFractionDigits: 2})} (Inv: ${bank.invoice_number})`
      });
    }
  });

  // Sort: Anomalies first, then unmatched, then matched
  return results.sort((a, b) => {
    const priority = {
      [MatchStatus.AMOUNT_MISMATCH]: 0,
      [MatchStatus.ID_MISMATCH]: 0, // Both anomalies have same priority
      [MatchStatus.MISSING_IN_BOOK]: 2,
      [MatchStatus.MISSING_IN_BANK]: 2,
      [MatchStatus.MATCHED]: 3
    };
    return priority[a.status] - priority[b.status];
  });
};