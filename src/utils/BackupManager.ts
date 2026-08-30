import { db } from '../db/db';
import axios from 'axios';
import toast from 'react-hot-toast';

export const createBackupData = async () => {
  const settings = await db.settings.toArray();
  const customers = await db.customers.toArray();
  const contracts = await db.contracts.toArray();
  return {
    timestamp: Date.now(),
    settings,
    customers,
    contracts
  };
};

export const restoreFromBackupData = async (data: any) => {
  if (!data || !data.settings || !data.customers || !data.contracts) throw new Error('فرمت بکاپ نامعتبر است');
  
  await db.transaction('rw', db.settings, db.customers, db.contracts, async () => {
    await db.settings.clear();
    await db.customers.clear();
    await db.contracts.clear();
    
    if (data.settings.length > 0) await db.settings.bulkAdd(data.settings);
    if (data.customers.length > 0) await db.customers.bulkAdd(data.customers);
    if (data.contracts.length > 0) await db.contracts.bulkAdd(data.contracts);
  });
};

export const doAutoBackup = async () => {
  try {
    const backupData = await createBackupData();
    const backupString = JSON.stringify(backupData);
    
    // Offline Backup (localStorage as secondary replica)
    try {
      localStorage.setItem('offline_auto_backup', backupString);
    } catch (e) {
      console.warn('LocalStorage full, skipping offline replica');
    }

    // Online Backup (Server API) - Use sendBeacon for reliable delivery on exit
    const blob = new Blob([backupString], { type: 'application/json' });
    navigator.sendBeacon('/api/backup', blob);
    
    return true;
  } catch (err) {
    console.error('Auto backup failed', err);
    return false;
  }
};

export const checkAndRestoreAutoBackup = async () => {
  try {
    let onlineBackup: any = null;
    let offlineBackup: any = null;

    // Try to get online backup
    try {
      const res = await axios.get('/api/backup');
      if (res.data && res.data.timestamp) {
        onlineBackup = res.data;
      }
    } catch (e) {
      console.log('No online backup found or offline.');
    }

    // Get offline backup
    const offlineStr = localStorage.getItem('offline_auto_backup');
    if (offlineStr) {
      try {
        offlineBackup = JSON.parse(offlineStr);
      } catch (e) {}
    }

    // Determine the newest backup
    let newestBackup = null;
    if (onlineBackup && offlineBackup) {
      newestBackup = onlineBackup.timestamp > offlineBackup.timestamp ? onlineBackup : offlineBackup;
    } else {
      newestBackup = onlineBackup || offlineBackup;
    }

    if (newestBackup) {
      const currentCustomersCount = await db.customers.count();
      const currentContractsCount = await db.contracts.count();
      
      // Auto-restore condition: if the current DB is completely empty and we have a backup
      // Or we can blindly overwrite, but that is DANGEROUS if the user has multiple tabs.
      // But user asked: "به هنگام ورود از بک آپ خود استفاده کند" (use its backup on entry)
      // I'll restore if DB is empty, or if we want to force it, maybe add a small UI to ask? No, they said automatic.
      if (currentCustomersCount === 0 && currentContractsCount === 0) {
        await restoreFromBackupData(newestBackup);
        toast.success('اطلاعات با موفقیت از بکاپ خودکار (آنلاین/آفلاین) بازیابی شد.');
        setTimeout(() => window.location.reload(), 1000);
      }
    }
  } catch (err) {
    console.error('Error checking auto backup', err);
  }
};
