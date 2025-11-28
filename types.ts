export interface BookRecord {
  document_no: string;
  posting_date: string;
  description: string; // Used as Invoice Number reference
  amount: number;
  original_amount_string: string;
  id: string;
}

export interface BankRecord {
  account_no: string;
  transaction_date: string;
  time: string;
  invoice_number: string;
  fuel_brand: string;
  total_amount: number;
  id: string;
}

export enum MatchStatus {
  MATCHED = 'MATCHED',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  ID_MISMATCH = 'ID_MISMATCH', // Likely wrong invoice number entered
  MISSING_IN_BANK = 'MISSING_IN_BANK',
  MISSING_IN_BOOK = 'MISSING_IN_BOOK',
}

export interface ReconResult {
  bookRecord: BookRecord | null;
  bankRecord: BankRecord | null;
  status: MatchStatus;
  confidence: number; // 0-100
  suggestedFix?: string;
  anomalyType?: 'Transposition' | 'Typo' | 'Wrong Invoice' | 'None';
  difference?: number;
}
