import React from 'react';
import { Bell } from 'lucide-react';

type Props = {
  name?: string;
  avatarUrl?: string;
  status?: string;
};

export const ProfileCard: React.FC<Props> = ({ name = 'KM', avatarUrl, status = 'Checked In' }) => {
  return (
    <div className="flex items-center gap-4 bg-white/6 backdrop-blur-sm p-3 rounded-lg shadow-sm">
      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-300 shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-400 text-white font-semibold">{String(name).split(' ').map(s=>s[0]).join('').slice(0,2)}</div>
        )}
      </div>
      <div className="hidden sm:flex flex-col text-sm">
        <span className="font-semibold text-white">{name}</span>
        <span className="text-xs text-slate-300">{status === 'Checked In' ? (<span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/> {status}</span>) : status}</span>
      </div>
      <div className="ml-2 hidden sm:block">
        <button className="p-2 rounded-full bg-white/6"><Bell className="w-4 h-4 text-slate-200" /></button>
      </div>
    </div>
  );
};

export default ProfileCard;
