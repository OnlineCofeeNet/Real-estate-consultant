const fs = require('fs');
let code = fs.readFileSync('src/components/AuthGate.tsx', 'utf8');

if (!code.includes('UserProfileModal')) {
  code = code.replace("import { Navigate", "import { UserProfileModal } from './UserProfileModal';\nimport { Navigate");
  
  const oldMenuStr = `  const logout = () => {
    clearSession();
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400">{session.username} · {roleLabel[session.role]}</span>
      <button onClick={logout} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white">خروج</button>
    </div>
  );`;

  const newMenuStr = `  const [showProfile, setShowProfile] = useState(false);
  const logout = () => {
    clearSession();
    navigate('/');
    window.location.reload();
  };

  return (
    <>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">{session.username} · {roleLabel[session.role]}</span>
        <button onClick={() => setShowProfile(true)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">پروفایل</button>
        <button onClick={logout} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white">خروج</button>
      </div>
      {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );`;
  
  code = code.replace(oldMenuStr, newMenuStr);
  fs.writeFileSync('src/components/AuthGate.tsx', code);
  console.log("Patched UserMenu");
}
