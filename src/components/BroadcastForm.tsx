import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Image as ImageIcon, MessageCircle, Send, RefreshCw } from 'lucide-react';
import { toEnglishDigits } from '../utils/format';

interface BotUser { chatId: string; platform: string; fullName?: string; }
type Platform = 'telegram' | 'bale' | 'rubika';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const BATCH_SIZE = 4;

export const BroadcastForm = () => {
  const [message, setMessage] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [target, setTarget] = useState<'all' | 'group'>('all');
  const [groupId, setGroupId] = useState('');
  const [platform, setPlatform] = useState<Platform>('telegram');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<BotUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await axios.get('/api/bot/connected-users', { timeout: 10000 });
      if (res.data?.success && Array.isArray(res.data.users)) setConnectedUsers(res.data.users);
    } catch {
      toast.error('دریافت کاربران متصل ناموفق بود');
    } finally { setLoadingUsers(false); }
  };

  useEffect(() => { void fetchUsers(); }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('فقط فایل تصویر مجاز است');
    if (file.size > MAX_IMAGE_BYTES) return toast.error('حجم تصویر نباید بیشتر از ۵ مگابایت باشد');
    const reader = new FileReader();
    reader.onerror = () => toast.error('خواندن تصویر ناموفق بود');
    reader.onloadend = () => setImageBase64(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const sendToUser = async (user: BotUser) => {
    const res = await axios.post('/api/send-message', {
      platform, chatId: user.chatId, message: message.trim(), imageBase64
    }, { timeout: 30000 });
    return Boolean(res.data?.success);
  };

  const handleBroadcast = async () => {
    const cleanMessage = message.trim();
    if (!cleanMessage && !imageBase64) return toast.error('متن پیام یا تصویر را وارد کنید');
    if (target === 'group' && !groupId.trim()) return toast.error('شناسه گروه را وارد کنید');

    setIsBroadcasting(true);
    try {
      if (target === 'group') {
        const cleanId = toEnglishDigits(groupId).trim();
        const res = await axios.post('/api/send-message', {
          platform, chatId: cleanId, message: cleanMessage, imageBase64
        }, { timeout: 30000 });
        if (res.data?.success) {
          toast.success('پیام با موفقیت ارسال شد');
          setMessage(''); setImageBase64(''); setGroupId('');
        } else toast.error(res.data?.error || 'خطا در ارسال پیام');
        return;
      }

      // Remove duplicate chat IDs so a user is never messaged twice by the UI.
      const users = Array.from(new Map(
        connectedUsers.filter(u => u.platform === platform && u.chatId).map(u => [u.chatId, u])
      ).values());
      if (!users.length) return toast.error('کاربری در این پلتفرم یافت نشد');

      toast.loading(`در حال ارسال به ${users.length} کاربر...`, { id: 'broadcast' });
      let success = 0, failed = 0;
      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(sendToUser));
        results.forEach(r => r.status === 'fulfilled' && r.value ? success++ : failed++);
        toast.loading(`ارسال: ${Math.min(i + BATCH_SIZE, users.length)}/${users.length}`, { id: 'broadcast' });
      }
      toast.success(`ارسال پایان یافت: ${success} موفق، ${failed} ناموفق`, { id: 'broadcast' });
      setMessage(''); setImageBase64('');
    } catch {
      toast.error('خطای ارتباط با سرور', { id: 'broadcast' });
    } finally { setIsBroadcasting(false); }
  };

  const usersCount = connectedUsers.filter(u => u.platform === platform).length;
  const buttonClass = (active: boolean) => `flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${active ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><MessageCircle size={22} /></div>
        <div className="flex-1"><h3 className="font-bold text-slate-800 text-lg">ارسال پیام گروهی</h3><p className="text-xs text-slate-500">ارسال متن و تصویر به کاربران بات یا گروه</p></div>
        <button type="button" onClick={() => void fetchUsers()} disabled={loadingUsers} className="p-2 rounded-lg hover:bg-white text-slate-500" title="به‌روزرسانی کاربران"><RefreshCw size={18} className={loadingUsers ? 'animate-spin' : ''} /></button>
      </div>
      <div className="p-6 space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">پلتفرم هدف</label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['telegram','bale','rubika'] as Platform[]).map(p => <button key={p} type="button" onClick={() => setPlatform(p)} className={buttonClass(platform === p)}>{p === 'telegram' ? 'تلگرام' : p === 'bale' ? 'بله' : 'روبیکا'}</button>)}
          </div>
        </div>
        <div className="flex gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={target === 'all'} onChange={() => setTarget('all')} />همه کاربران ({usersCount})</label>
          <label className="flex items-center gap-2"><input type="radio" checked={target === 'group'} onChange={() => setTarget('group')} />گروه خاص</label>
        </div>
        {target === 'group' && <input dir="ltr" value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="Chat ID" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 font-mono outline-none focus:ring-2 focus:ring-blue-500" />}
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="متن پیام خود را بنویسید..." className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 min-h-[120px] resize-y outline-none focus:ring-2 focus:ring-blue-500" />
        <div>
          {imageBase64 ? <div className="relative h-40 rounded-xl overflow-hidden border"><img src={imageBase64} alt="پیش‌نمایش" className="w-full h-full object-contain bg-slate-50" /><button type="button" onClick={() => setImageBase64('')} className="absolute top-2 right-2 bg-white px-3 py-1 rounded-lg text-red-600 shadow">حذف</button></div> : <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100"><ImageIcon className="w-8 h-8 text-slate-400 mb-2" /><span className="text-sm text-slate-500">تصویر تا ۵ مگابایت انتخاب کنید</span><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} /></label>}
        </div>
        <button type="button" onClick={() => void handleBroadcast()} disabled={isBroadcasting || (target === 'group' && !groupId.trim()) || (!message.trim() && !imageBase64)} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold">
          {isBroadcasting ? 'در حال ارسال...' : <><Send size={18} /> ارسال پیام</>}
        </button>
      </div>
    </div>
  );
};
