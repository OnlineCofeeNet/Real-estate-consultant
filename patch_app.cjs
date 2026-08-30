const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importBackup = "import { doAutoBackup, checkAndRestoreAutoBackup } from './utils/BackupManager';\n";
code = code.replace("import { useAutoMessages }", importBackup + "import { useAutoMessages }");

const useEffectBackup = `
  useEffect(() => {
    // On load, check for auto backup
    checkAndRestoreAutoBackup();

    // On exit / hide, do auto backup
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        doAutoBackup();
      }
    };
    
    // Fallback for beforeunload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      doAutoBackup();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
`;

code = code.replace("useAutoMessages();", "useAutoMessages();\n" + useEffectBackup);

fs.writeFileSync('src/App.tsx', code);
