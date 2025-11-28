import React, { useState, useEffect, useMemo } from 'react';
import { parseBookData, parseBankData } from './utils/parser';
import { reconcileData } from './utils/logic';
import { RAW_BOOK_CSV, RAW_BANK_CSV } from './constants';
import { ReconResult, MatchStatus } from './types';

// Icons
const CheckCircle = () => <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
const AlertCircle = () => <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const HelpCircle = () => <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const LightBulb = () => <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548 5.478a1 1 0 01-1.071 1.071H12a1 1 0 01-1.071-1.071L10.227 16.34z" /></svg>;

export default function App() {
  const [data, setData] = useState<ReconResult[]>([]);
  const [filter, setFilter] = useState<string>('ANOMALIES'); // Default to show Anomalies first

  useEffect(() => {
    const books = parseBookData(RAW_BOOK_CSV);
    const banks = parseBankData(RAW_BANK_CSV);
    const results = reconcileData(books, banks);
    setData(results);
  }, []);

  const stats = useMemo(() => {
    return {
      total: data.length,
      matched: data.filter(r => r.status === MatchStatus.MATCHED).length,
      anomalies: data.filter(r => r.status === MatchStatus.AMOUNT_MISMATCH || r.status === MatchStatus.ID_MISMATCH).length,
      amountMismatch: data.filter(r => r.status === MatchStatus.AMOUNT_MISMATCH).length,
      idMismatch: data.filter(r => r.status === MatchStatus.ID_MISMATCH).length,
      unmatched: data.filter(r => r.status === MatchStatus.MISSING_IN_BANK || r.status === MatchStatus.MISSING_IN_BOOK).length,
      missingInBank: data.filter(r => r.status === MatchStatus.MISSING_IN_BANK).length,
      missingInBook: data.filter(r => r.status === MatchStatus.MISSING_IN_BOOK).length,
    };
  }, [data]);

  const filteredData = data.filter(r => {
    if (filter === 'ALL') return true;
    if (filter === 'ANOMALIES') return r.status === MatchStatus.AMOUNT_MISMATCH || r.status === MatchStatus.ID_MISMATCH;
    if (filter === 'MATCHED') return r.status === MatchStatus.MATCHED;
    if (filter === 'UNMATCHED') return r.status === MatchStatus.MISSING_IN_BANK || r.status === MatchStatus.MISSING_IN_BOOK;
    return true;
  });

  const handleFix = (index: number) => {
    const newData = [...data];
    if (newData[index]) {
       newData[index] = { 
         ...newData[index], 
         status: MatchStatus.MATCHED, 
         suggestedFix: undefined, 
         anomalyType: undefined 
       };
       setData(newData);
    }
  };

  const getAnomalyLabel = (type?: string) => {
    switch(type) {
      case 'Transposition': return 'ตัวเลขสลับหลัก (Transposition)';
      case 'Wrong Invoice': return 'ระบุ Invoice ผิด (Wrong ID)';
      case 'Typo': return 'ตัวเลขไม่ตรง (Amount Mismatch)';
      default: return 'ตรวจสอบข้อมูล';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <header className="mb-6 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">SmartRecon AI</h1>
          <p className="text-gray-600 text-sm md:text-base">ระบบตรวจสอบและกระทบยอดบัญชีอัตโนมัติ (Reconciliation Dashboard)</p>
        </div>
        <div className="text-right">
           <div className="text-xs text-gray-500 mb-1">Last Updated</div>
           <div className="text-sm font-medium">{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Analysis Summary Card */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <LightBulb />
            <h2 className="text-lg font-bold text-gray-800">สรุปผลการตรวจสอบ (Audit Summary)</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="space-y-2">
              <span className="text-sm text-red-600 font-bold uppercase tracking-wide">ข้อผิดพลาดที่พบ</span>
              <div className="flex items-end gap-2">
                 <div className="text-4xl font-bold text-red-600 leading-none">{stats.anomalies}</div>
                 <div className="text-sm text-red-500 font-medium mb-1">รายการ</div>
              </div>
              <div className="text-xs text-gray-500">
                 พบ {stats.amountMismatch} ยอดไม่ตรง, {stats.idMismatch} Invoice ผิด
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-orange-600 font-bold uppercase tracking-wide">รายการตกหล่น</span>
              <div className="flex items-end gap-2">
                 <div className="text-4xl font-bold text-orange-600 leading-none">{stats.unmatched}</div>
                 <div className="text-sm text-orange-500 font-medium mb-1">รายการ</div>
              </div>
              <div className="text-xs text-gray-500">
                 ขาดใน Book {stats.missingInBook}, ขาดใน Bank {stats.missingInBank}
              </div>
            </div>

             <div className="space-y-2">
              <span className="text-sm text-green-600 font-bold uppercase tracking-wide">ถูกต้องสมบูรณ์</span>
              <div className="flex items-end gap-2">
                <div className="text-4xl font-bold text-green-600 leading-none">{stats.matched}</div>
                <div className="text-sm text-green-500 font-medium mb-1">รายการ</div>
              </div>
               <div className="text-xs text-gray-500">
                 จากทั้งหมด {stats.total} รายการ
              </div>
            </div>
            
            <div className="space-y-2 flex flex-col justify-end">
               <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${(stats.matched / stats.total) * 100}%` }}></div>
               </div>
               <div className="text-xs text-right text-gray-500">
                 ความคืบหน้า: {Math.round((stats.matched / stats.total) * 100)}%
               </div>
            </div>

          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button 
              onClick={() => setFilter('ANOMALIES')}
              className={`px-6 py-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 border-b-2 transition-colors ${filter === 'ANOMALIES' ? 'text-red-600 border-red-600 bg-red-50' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}
            >
              <AlertCircle />
              ต้องตรวจสอบ ({stats.anomalies})
            </button>
            <button 
              onClick={() => setFilter('UNMATCHED')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap flex items-center gap-2 border-b-2 transition-colors ${filter === 'UNMATCHED' ? 'text-orange-600 border-orange-600 bg-orange-50' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}
            >
              <HelpCircle />
              ไม่พบคู่ ({stats.unmatched})
            </button>
            <button 
              onClick={() => setFilter('MATCHED')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap flex items-center gap-2 border-b-2 transition-colors ${filter === 'MATCHED' ? 'text-green-600 border-green-600 bg-green-50' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}
            >
              <CheckCircle />
              ถูกต้อง ({stats.matched})
            </button>
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${filter === 'ALL' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}
            >
              รายการทั้งหมด
            </button>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-200">
            {filteredData.map((item, idx) => {
              const originalIndex = data.indexOf(item);
              
              return (
                <div key={idx} className={`p-6 hover:bg-gray-50 transition-colors ${item.status === MatchStatus.AMOUNT_MISMATCH || item.status === MatchStatus.ID_MISMATCH ? 'bg-red-50/40' : ''}`}>
                  <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                    
                    {/* Book Side */}
                    <div className="flex-1 w-full relative group">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">
                        <span>ข้อมูลใน Book (GL)</span>
                      </div>
                      {item.bookRecord ? (
                        <div className={`p-3 rounded-lg border ${item.status === MatchStatus.ID_MISMATCH ? 'bg-red-50 border-red-200 ring-1 ring-red-100' : 'bg-white border-gray-200'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-mono font-medium ${item.status === MatchStatus.ID_MISMATCH ? 'text-red-700 bg-red-100 px-1 rounded' : 'text-gray-900'}`}>
                              Inv: {item.bookRecord.description}
                            </span>
                            <span className="text-xs text-gray-400">{item.bookRecord.posting_date}</span>
                          </div>
                          <div className={`text-xl font-mono ${item.status === MatchStatus.AMOUNT_MISMATCH ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                            {item.bookRecord.amount.toLocaleString('en-US', { style: 'currency', currency: 'THB' })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">ไม่มีข้อมูลใน Book</div>
                      )}
                    </div>

                    {/* Action Center */}
                    <div className="hidden md:flex flex-col items-center justify-center self-stretch w-12 pt-6">
                       <div className="h-px w-full bg-gray-200 mb-1"></div>
                       <div className="text-gray-300 transform rotate-0">
                         {item.status === MatchStatus.MATCHED ? <CheckCircle /> : <div className="bg-gray-100 rounded-full p-1">&rarr;</div>}
                       </div>
                       <div className="h-px w-full bg-gray-200 mt-1"></div>
                    </div>

                    {/* Bank Side */}
                    <div className="flex-1 w-full">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        ข้อมูลใน Bank
                        <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-medium">Source of Truth</span>
                      </div>
                      {item.bankRecord ? (
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                           <div className="flex justify-between items-start mb-1">
                             <span className="font-mono font-medium text-gray-900">Inv: {item.bankRecord.invoice_number}</span>
                             <span className="text-xs text-gray-400">{item.bankRecord.transaction_date}</span>
                           </div>
                           <div className="text-xl font-mono text-blue-600 font-medium">
                              {item.bankRecord.total_amount.toLocaleString('en-US', { style: 'currency', currency: 'THB' })}
                           </div>
                           <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                             {item.bankRecord.fuel_brand}
                           </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">ไม่มีข้อมูลใน Bank</div>
                      )}
                    </div>

                    {/* Recommendation Area */}
                    {(item.suggestedFix || item.status === MatchStatus.MATCHED) && (
                      <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 mt-2 md:mt-0 flex flex-col justify-center">
                        {item.suggestedFix ? (
                          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                            <div className="text-xs font-bold text-yellow-800 mb-2 uppercase flex items-center gap-2">
                              {item.anomalyType && <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                              </span>}
                              {getAnomalyLabel(item.anomalyType)}
                            </div>
                            <p className="text-sm text-gray-800 mb-3 leading-relaxed">
                              {item.suggestedFix}
                            </p>
                            <button 
                              onClick={() => handleFix(originalIndex)}
                              className="w-full py-2 px-3 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-semibold rounded shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 group"
                            >
                              <span>แก้ไขตามนี้</span>
                              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center text-green-600 gap-2 p-4 bg-green-50 rounded-lg border border-green-100 opacity-75">
                            <CheckCircle />
                            <span className="text-sm font-medium">ข้อมูลถูกต้องตรงกัน</span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
            
            {filteredData.length === 0 && (
              <div className="p-16 text-center">
                <div className="inline-block p-4 rounded-full bg-gray-100 mb-4 text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">ไม่พบรายการ</h3>
                <p className="text-gray-500">ไม่มีข้อมูลในหมวดหมู่นี้</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}