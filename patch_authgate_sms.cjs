const fs = require('fs');
let code = fs.readFileSync('src/components/AuthGate.tsx', 'utf8');

const newRecoverStr = `
const RecoverPassword = ({ onBack }: { onBack: () => void }) => {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<'none'|'sms'|'questions'>('none');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const qs = await getUserSecurityQuestions(username);
      setQ1(qs.q1);
      setQ2(qs.q2);
      setStep(2);
      setMethod('questions');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'نام کاربری یافت نشد.');
    } finally {
      setBusy(false);
    }
  };
  
  const submitSmsRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { default: axios } = await import('axios');
      const res = await axios.post('/api/users/recover-sms', { username, phone });
      toast.success(res.data.message || 'رمز عبور جدید پیامک شد');
      onBack();
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'خطا در ارسال پیامک');
    } finally {
      setBusy(false);
    }
  };

  const submitRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await recoverPassword(username, a1, a2, newPassword);
      toast.success('رمز عبور شما با موفقیت تغییر کرد.');
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در تایید پاسخ‌ها.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="بازیابی رمز عبور" subtitle={step === 1 ? "نام کاربری خود را وارد کنید." : (method === 'sms' ? "تایید شماره موبایل" : "به سوالات امنیتی پاسخ دهید.")}>
      {step === 1 ? (
        <form onSubmit={(e) => { e.preventDefault(); setStep(1.5); }} className="space-y-4">
          <Field label="نام کاربری" value={username} onChange={setUsername} required />
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 font-bold">{busy ? 'در حال بررسی...' : 'ادامه'}</button>
          <button type="button" onClick={onBack} className="w-full mt-2 text-sm font-medium text-slate-500 hover:text-slate-800">بازگشت</button>
        </form>
      ) : step === 1.5 ? (
        <div className="space-y-4">
          <button onClick={() => { setStep(2); setMethod('sms'); }} className="w-full py-4 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold transition-colors">بازیابی با پیامک / بات</button>
          <button onClick={(e) => fetchQuestions(e as any)} className="w-full py-4 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold transition-colors">بازیابی با سوالات امنیتی</button>
          <button type="button" onClick={() => setStep(1)} className="w-full mt-2 text-sm font-medium text-slate-500 hover:text-slate-800">بازگشت</button>
        </div>
      ) : method === 'sms' ? (
        <form onSubmit={submitSmsRecovery} className="space-y-4">
           <div className="p-4 bg-slate-50 rounded-xl mb-4 text-sm font-medium text-slate-700 text-center">نام کاربری: {username}</div>
           <Field label="شماره موبایل ثبت شده" value={phone} onChange={setPhone} required />
           {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
           <button disabled={busy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 font-bold">{busy ? 'در حال ارسال پیامک...' : 'ارسال رمز جدید'}</button>
           <button type="button" onClick={() => setStep(1.5)} className="w-full mt-2 text-sm font-medium text-slate-500 hover:text-slate-800">تغییر روش بازیابی</button>
        </form>
      ) : (
        <form onSubmit={submitRecovery} className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl mb-4 text-sm font-medium text-slate-700 text-center">نام کاربری: {username}</div>
          <Field label={\`سوال اول: \${q1}\`} value={a1} onChange={setA1} required />
          <Field label={\`سوال دوم: \${q2}\`} value={a2} onChange={setA2} required />
          <Field label="رمز عبور جدید" value={newPassword} onChange={setNewPassword} type="password" required />
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 font-bold">{busy ? 'در حال تغییر رمز...' : 'تغییر رمز عبور'}</button>
          <button type="button" onClick={() => setStep(1.5)} className="w-full mt-2 text-sm font-medium text-slate-500 hover:text-slate-800">تغییر روش بازیابی</button>
        </form>
      )}
    </AuthShell>
  );
};
`;

const oldRecoverRegex = /const RecoverPassword = \(\{ onBack \}: \{ onBack: \(\) => void \}\) => \{[\s\S]*?    <\/AuthShell>\n  \);\n\};\n/m;
code = code.replace(oldRecoverRegex, newRecoverStr + "\n");
fs.writeFileSync('src/components/AuthGate.tsx', code);
