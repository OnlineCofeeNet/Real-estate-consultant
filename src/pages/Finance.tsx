import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { paymentStatus } from '../services/finance';
import type { Invoice, PaymentMethod } from '../types';
import { CreditCard, FileText, Wallet, CheckCircle2, Clock3, Search } from 'lucide-react';

const money = (value: number) => new Intl.NumberFormat('fa-IR').format(Math.round(value || 0));

const Finance = () => {
  const invoices = useLiveQuery(() => db.invoices.orderBy('issuedAt').reverse().toArray(), []);
  const payments = useLiveQuery(() => db.payments.toArray(), []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');

  const paymentByInvoice = useMemo(() => {
    const map = new Map<number, number>();
    for (const payment of payments || []) {
      if (payment.status !== 'completed') continue;
      map.set(payment.invoiceId, (map.get(payment.invoiceId) || 0) + payment.amount);
    }
    return map;
  }, [payments]);

  const rows = useMemo(() => {
    return (invoices || []).filter((invoice) => {
      const paid = paymentByInvoice.get(invoice.id || 0) || invoice.paidAmount || 0;
      const status = paymentStatus(paid, invoice.total);
      const q = search.trim();
      const matchesSearch = !q || invoice.invoiceNumber.includes(q) || invoice.customerName.includes(q) || invoice.contractNumber.includes(q);
      const matchesFilter = filter === 'all' || status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [invoices, paymentByInvoice, search, filter]);

  const summary = useMemo(() => {
    let total = 0;
    let paid = 0;
    for (const invoice of invoices || []) {
      total += invoice.total || 0;
      paid += paymentByInvoice.get(invoice.id || 0) || invoice.paidAmount || 0;
    }
    return { total, paid, remaining: Math.max(0, total - paid), count: invoices?.length || 0 };
  }, [invoices, paymentByInvoice]);

  return (
    <div className="page-container" dir="rtl">
      <div className="page-header">
        <div>
          <h1>مدیریت مالی</h1>
          <p>فاکتورها، دریافتی‌ها و مانده حساب‌ها در یک مرکز واحد</p>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card"><FileText size={22}/><span>کل فاکتورها</span><strong>{money(summary.count)}</strong></div>
        <div className="stat-card"><Wallet size={22}/><span>مبلغ فاکتورها</span><strong>{money(summary.total)} تومان</strong></div>
        <div className="stat-card"><CheckCircle2 size={22}/><span>دریافتی</span><strong>{money(summary.paid)} تومان</strong></div>
        <div className="stat-card"><Clock3 size={22}/><span>مانده</span><strong>{money(summary.remaining)} تومان</strong></div>
      </div>

      <div className="panel">
        <div className="panel-header" style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:1,minWidth:220}}>
            <Search size={18} style={{position:'absolute',right:10,top:10}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جستجوی شماره فاکتور، قرارداد یا مشتری" style={{paddingRight:36,width:'100%'}} />
          </div>
          <select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}>
            <option value="all">همه</option>
            <option value="unpaid">پرداخت نشده</option>
            <option value="partial">پرداخت ناقص</option>
            <option value="paid">تسویه شده</option>
          </select>
        </div>

        <div style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead><tr><th>فاکتور</th><th>قرارداد</th><th>خدمات‌گیرنده</th><th>مبلغ</th><th>دریافتی</th><th>مانده</th><th>وضعیت</th></tr></thead>
            <tbody>
              {rows.map((invoice: Invoice) => {
                const paid = paymentByInvoice.get(invoice.id || 0) || invoice.paidAmount || 0;
                const status = paymentStatus(paid, invoice.total);
                return <tr key={invoice.id}>
                  <td>{invoice.invoiceNumber}</td><td>{invoice.contractNumber}</td><td>{invoice.customerName}</td>
                  <td>{money(invoice.total)}</td><td>{money(paid)}</td><td>{money(Math.max(0, invoice.total-paid))}</td>
                  <td><span className={`status-badge ${status}`}>{status === 'paid' ? 'تسویه' : status === 'partial' ? 'ناقص' : 'پرداخت نشده'}</span></td>
                </tr>;
              })}
              {rows.length === 0 && <tr><td colSpan={7} style={{textAlign:'center',padding:30}}>فاکتوری برای نمایش وجود ندارد.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;
