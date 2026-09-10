const fs = require('fs');
let code = fs.readFileSync('src/pages/Users.tsx', 'utf8');

const importBlock = `import { createUserByAdmin } from '../services/auth';\nimport { UserPlus, X } from 'lucide-react';`;
code = code.replace("import { Shield,", importBlock + "\nimport { Shield,");

const stateBlock = `
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', phone: '', role: 'agent' });
  
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUserByAdmin(newUser.username, newUser.password, newUser.email, newUser.phone, newUser.role);
      toast.success('کاربر با موفقیت اضافه شد');
      setShowAddModal(false);
      setNewUser({ username: '', password: '', email: '', phone: '', role: 'agent' });
    } catch(err: any) {
      toast.error(err.message || 'خطا در افزودن کاربر');
    }
  };
`;
code = code.replace("const [search, setSearch] = useState('');", "const [search, setSearch] = useState('');" + stateBlock);

const buttonBlock = `
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" />
          مدیریت کاربران و دسترسی‌ها
        </h1>
        <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-colors shadow-sm">
          <UserPlus size={18} />
          افزودن کاربر
        </button>
`;
code = code.replace(
`<h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" />
          مدیریت کاربران و دسترسی‌ها
        </h1>`, buttonBlock);

const modalBlock = `
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <UserPlus className="text-emerald-500" size={20} />
                افزودن کاربر جدید
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">نام کاربری</label>
                <input required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">رمز عبور</label>
                <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">موبایل</label>
                <input required value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ایمیل</label>
                <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">سطح دسترسی</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors bg-slate-50">
                  <option value="agent">مشاور</option>
                  <option value="accountant">حسابدار</option>
                  <option value="manager">مدیر</option>
                  <option value="admin">مدیر کل (Admin)</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-colors mt-6">
                ذخیره کاربر
              </button>
            </form>
          </div>
        </div>
      )}
`;
code = code.replace("</div>\n  );\n}", modalBlock + "\n    </div>\n  );\n}");

fs.writeFileSync('src/pages/Users.tsx', code);
