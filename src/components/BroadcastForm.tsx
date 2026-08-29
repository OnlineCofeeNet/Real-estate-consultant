import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Send, Users, Image as ImageIcon, MessageCircle } from 'lucide-react';
import { toEnglishDigits } from '../utils/format';

interface BotUser {
  chatId: string;
  platform: string;
  fullName: string;
}

export const BroadcastForm = () => {
  const [message, setMessage] = useState('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [target, setTarget] = useState<'all' | 'group'>('all');
  const [groupId, setGroupId] = useState('');
  const [platform, setPlatform] = useState<'telegram' | 'bale' | 'rubika'>('telegram');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<BotUser[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get('/api/bot/connected-users');
        if (res.data?.success) {
          setConnectedUsers(res.data.users);
        }
      } catch (e) {}
    };
    fetchUsers();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBroadcast = async () => {
    if (!message.trim() && !imageBase64) {
      toast.error('لطفاً متن پیام یا تصویر را وارد کنید');
      return;
    }

    setIsBroadcasting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      if (target === 'group') {
        if (!groupId.trim()) {
          toast.error('لطفاً شناسه گروه را وارد کنید');
          setIsBroadcasting(false);
          return;
        }
        
        const cleanId = toEnglishDigits(groupId).trim();
        const res = await axios.post('/api/send-message', {
          platform,
          chatId: cleanId,
          message,
          imageBase64
        });
        
        if (res.data?.success) {
          toast.success('پیام با موفقیت به گروه ارسال شد');
        } else {
          toast.error(res.data?.error || 'خطا در ارسال به گروه');
        }
      } else {
        const targetUsers = connectedUsers.filter(u => u.platform === platform);
        
        if (targetUsers.length === 0) {
          toast.error('کاربری در این پلتفرم یافت نشد');
          setIsBroadcasting(false);
          return;
        }

        toast.loading(`در حال ارسال به ${targetUsers.length} کاربر...`, { id: 'broadcast' });

        for (const user of targetUsers) {
          try {
            const res = await axios.post('/api/send-message', {
              platform,
              chatId: user.chatId,
              message,
              imageBase64
            });
            if (res.data?.success) successCount++;
            else failCount++;
          } catch (e) {
            failCount++;
          }
        }
        toast.success(`ارسال گروهی پایان یافت: ${successCount} موفق، ${failCount} ناموفق`, { id: 'broadcast' });
      }
      
      setMessage('');
      setImageBase64('');
      setGroupId('');
    } catch (err) {
      toast.error('خطای ارتباط با سرور');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const usersCount = connectedUsers.filter(u => u.platform === platform).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
          <MessageCircle size={22} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-lg">ارسال پیام گروهی (Broadcast) و ارسال به گروه</h3>
          <p className="text-xs text-slate-500 mt-0.5">ارسال پیام متنی و تصویر به کاربران بات یا گروه‌ها</p>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">پلتفرم هدف</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPlatform('telegram')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${platform === 'telegram' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  تلگرام
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('bale')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${platform === 'bale' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  بله
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('rubika')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${platform === 'rubika' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  روبیکا
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">مخاطب هدف</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={target === 'all'} 
                    onChange={() => setTarget('all')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">همه کاربران بات ({usersCount} نفر)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={target === 'group'} 
                    onChange={() => setTarget('group')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">ارسال به گروه خاص</span>
                </label>
              </div>
            </div>

            {target === 'group' && (
              <div className="animate-in fade-in zoom-in-95">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">شناسه گروه (Chat ID)</label>
                <input 
                  type="text" 
                  dir="ltr"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-left font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                  value={groupId} 
                  onChange={e => setGroupId(e.target.value)} 
                  placeholder="-1001234567890" 
                />
                <p className="text-[10px] text-slate-400 mt-1">بات باید در این گروه عضو و دارای دسترسی ارسال پیام باشد.</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">متن پیام (اختیاری اگر تصویر دارید)</label>
              <textarea 
                className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm min-h-[100px] resize-y" 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                placeholder="متن پیام خود را بنویسید..." 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>تصویر ضمیمه (اختیاری)</span>
                {imageBase64 && (
                  <button type="button" onClick={() => setImageBase64('')} className="text-red-500 hover:text-red-700">حذف تصویر</button>
                )}
              </label>
              <div className="flex items-center justify-center w-full">
                {imageBase64 ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200">
                    <img src={imageBase64} alt="Preview" className="w-full h-full object-contain bg-slate-50" />
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">کلیک کنید</span> یا تصویر را رها کنید</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
          <button 
            onClick={handleBroadcast} 
            disabled={isBroadcasting || (target === 'group' && !groupId.trim()) || (!message.trim() && !imageBase64)}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm font-bold transition-colors w-full md:w-auto min-w-[200px]"
          >
            {isBroadcasting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                در حال ارسال...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send size={18} />
                ارسال پیام
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
