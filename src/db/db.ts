import axios from 'axios';
import type { Customer, Contract, Settings, MessageLog, AuditLog, Invoice, Payment, AuthUser } from '../types';

class ApiTable<T extends { id?: number }> {
  constructor(private route: string) {}

  async toArray(): Promise<T[]> {
    const res = await axios.get(this.route);
    if (this.route === '/api/settings') {
      return res.data ? [res.data] : [];
    }
    return Array.isArray(res.data) ? res.data : [];
  }

  async add(item: T): Promise<number> {
    const res = await axios.post(this.route, item);
    return res.data; // should be the new ID
  }

  async bulkAdd(items: T[]): Promise<void> {
    for (const item of items) {
      await this.add(item);
    }
  }

  async put(item: T, explicitId?: number): Promise<number> {
    const id = explicitId || item.id;
    if (id) {
      await axios.put(`${this.route}/${id}`, item);
      return id;
    } else {
      return this.add(item);
    }
  }

  async update(id: number, changes: Partial<T>): Promise<number> {
    await axios.put(`${this.route}/${id}`, changes);
    return id;
  }

  async delete(id: number): Promise<void> {
    await axios.delete(`${this.route}/${id}`);
  }

  async clear(): Promise<void> {
    // We don't have a clear endpoint by default, maybe not needed or could loop.
    // For now, implement loop or ignore for safety.
    const all = await this.toArray();
    for (const item of all) {
      if (item.id) await this.delete(item.id);
    }
  }

  async get(id: number): Promise<T | undefined> {
    // For now, fetch all and find, or implement a specific API
    if (this.route === '/api/settings') {
      let res = await axios.get(this.route);
      if (!res.data) {
        // Seed default settings
        const defaultSettings = {
          agencyName: 'مشاورین املاک من',
          slogan: 'بهترین انتخاب برای شما',
          phone1: '',
          phone2: '',
          fax: '',
          email: '',
          address: '',
          currency: 'تومان',
          commissionRate: 1,
          taxRate: 9,
          posIp: '192.168.1.100',
          posPort: '8888',
          posTerminalId: '',
          psp: 'سامان کیش',
          bankDetails: '',
          accountHolderName: '',
          accountNumber: '',
          cardNumber: '',
          shebaNumber: '',
          theme: 'blue',
          themeEffect: 'none',
          font: 'vazirmatn',
          invoiceLayout: 'standard',
          paperSize: 'a4',
          darkMode: false,
          autoSendInvoices: false,
          autoSendChequeReminder: false,
          autoSendRentReminder: false,
          baleToken: '',
          rubikaToken: '',
          telegramToken: '',
          additionalPhones: [],
          socialLinks: [],
          defaultMessages: {
            welcome: 'سلام 🌹\nبه سامانه هوشمند اطلاع‌رسانی {نام_املاک} خوش آمدید.',
            birthday: 'زادروزتان خجسته باد! با بهترین آرزوها، مشاور املاک شما.',
            contractExpiry: 'مشتری گرامی، موعد قرارداد شما به زودی به پایان می‌رسد.',
            rentPayment: 'مشتری گرامی، موعد پرداخت اجاره بها نزدیک است.',
            chequeDue: 'مشتری گرامی، موعد سررسید چک شما نزدیک است.',
            businessCard: 'املاک ما - بهترین مشاور شما در منطقه. تلفن: {phone1}',
          },
        };
        await axios.post(this.route, defaultSettings);
        res = await axios.get(this.route);
      }
      return res.data ? res.data : undefined;
    }
    const all = await this.toArray();
    return all.find((item: any) => item.id === id);
  }

  where(field: string) {
    return {
      equals: (value: any) => ({
        first: async (): Promise<T | undefined> => {
          const all = await this.toArray();
          return all.find((item: any) => item[field] === value);
        },
        toArray: async (): Promise<T[]> => {
          const all = await this.toArray();
          return all.filter((item: any) => item[field] === value);
        }
      })
    }
  }

  orderBy(field: string) {
    return {
      reverse: () => ({
        toArray: async (): Promise<T[]> => {
          const all = await this.toArray();
          return all.sort((a: any, b: any) => {
            if (a[field] < b[field]) return 1;
            if (a[field] > b[field]) return -1;
            return 0;
          });
        }
      })
    }
  }

  async count(): Promise<number> {
    const all = await this.toArray();
    return all.length;
  }
}

class ApiDatabase {
  customers = new ApiTable<Customer>('/api/customers');
  contracts = new ApiTable<Contract>('/api/contracts');
  settings = new ApiTable<Settings>('/api/settings');
  messageLogs = new ApiTable<MessageLog>('/api/messageLogs');
  auditLogs = new ApiTable<AuditLog>('/api/auditLogs');
  invoices = new ApiTable<Invoice>('/api/invoices');
  payments = new ApiTable<Payment>('/api/payments');
  users = new ApiTable<AuthUser>('/api/users');

  async cascadeDeleteContract(id: number) {
    const res = await axios.delete(`/api/contracts/${id}/cascade`);
    return res.data;
  }

  async completeContractTransaction(payload: any) {
    const res = await axios.post('/api/contracts/complete', payload);
    return res.data;
  }
  async transaction(...args: any[]) {
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      await callback();
    }
  }
  
  on(event: string, callback: () => void) {
    // Ignore populate event for API
  }
}

export const db = new ApiDatabase();

// Use an event emitter to re-render useLiveQuery hooks
const listeners = new Set<() => void>();

// Optionally, wrap the API methods to trigger re-renders on writes
const originalAdd = ApiTable.prototype.add;
ApiTable.prototype.add = async function (this: any, item: any) {
  const res = await originalAdd.call(this, item);
  listeners.forEach(cb => cb());
  return res;
};

const originalPut = ApiTable.prototype.put;
ApiTable.prototype.put = async function (this: any, item: any, explicitId?: number) {
  const res = await originalPut.call(this, item, explicitId);
  listeners.forEach(cb => cb());
  return res;
};

const originalUpdate = ApiTable.prototype.update;
ApiTable.prototype.update = async function (this: any, id: number, changes: any) {
  const res = await originalUpdate.call(this, id, changes);
  listeners.forEach(cb => cb());
  return res;
};

const originalDelete = ApiTable.prototype.delete;
ApiTable.prototype.delete = async function (this: any, id: number) {
  const res = await originalDelete.call(this, id);
  listeners.forEach(cb => cb());
  return res;
};

// Polyfill useLiveQuery
import { useState, useEffect } from 'react';

export function useLiveQuery<T>(querier: () => Promise<T>, deps: any[] = []): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);
  
  useEffect(() => {
    let active = true;
    const fetch = () => {
      querier().then(res => {
        if (active) setData(res);
      }).catch(console.error);
    };
    
    fetch();
    listeners.add(fetch);
    return () => {
      active = false;
      listeners.delete(fetch);
    };
  }, deps);
  
  return data;
}
