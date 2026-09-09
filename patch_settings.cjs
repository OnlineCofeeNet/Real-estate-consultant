const fs = require('fs');

const file = 'src/pages/Settings.tsx';
let content = fs.readFileSync(file, 'utf8');

const changePasswordComponent = `
const ChangePasswordCard = () => {
  const session = getSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('تکرار رمز عبور مطابقت ندارد.');
    if (!session) return;
    
    setBusy(true);
    try {
      await changePassword(session.userId, currentPassword, newPassword);
      toast.success('رمز عبور شما با موفقیت تغییر کرد.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch(err: any) {
      toast.error(err.message || 'خطا در تغییر رمز عبور');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><KeyRound size={20} className="text-emerald-500" /> تغییر رمز عبور</h2>
      <form onSubmit={submit} className="max-w-sm space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          <span className="block mb-1.5">رمز عبور فعلی</span>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500" dir="ltr" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="block mb-1.5">رمز عبور جدید</span>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500" dir="ltr" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="block mb-1.5">تکرار رمز جدید</span>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500" dir="ltr" />
        </label>
        <button disabled={busy} className="w-full mt-4 bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold transition-colors">{busy ? 'در حال اعمال...' : 'بروزرسانی رمز عبور'}</button>
      </form>
    </div>
  );
};
`;

content = content.replace("import { Building2, Receipt", "import { KeyRound, Building2, Receipt");

// Insert the component before export default function Settings()
content = content.replace("export default function Settings() {", changePasswordComponent + "\nexport default function Settings() {");

// Inject inside the settings UI (at the top of the general tab, maybe)
content = content.replace(
  '{activeTab === \'general\' && (',
  '{activeTab === \'general\' && (\n        <div className="space-y-6">\n        <ChangePasswordCard />'
);

content = content.replace(
  '          </div>\n        </div>\n      )}',
  '          </div>\n        </div>\n        </div>\n      )}' // close the <div className="space-y-6">
);

fs.writeFileSync(file, content);
