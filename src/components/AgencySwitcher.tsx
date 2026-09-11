import React from 'react';
import { useAgency } from '../context/AgencyContext';
import { Building2, ChevronDown } from 'lucide-react';

export default function AgencySwitcher() {
  const { currentAgency, agencies, setCurrentAgency } = useAgency();

  if (!currentAgency) return null;

  if (agencies.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
        <Building2 size={18} />
        <span>{currentAgency.name}</span>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm font-medium"
      >
        <Building2 size={18} />
        <span>{currentAgency.name}</span>
        <ChevronDown size={16} />
      </button>

      <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {agencies.map((agency) => (
          <button
            key={agency.id}
            type="button"
            onClick={() => setCurrentAgency(agency)}
            className={`w-full text-right px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
              currentAgency.id === agency.id
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {agency.name}
          </button>
        ))}
      </div>
    </div>
  );
}
