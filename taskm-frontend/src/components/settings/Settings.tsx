import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/useAuth';

export default function Settings(): JSX.Element {
  const { state } = useAuth();
  const isAdmin = state.user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'profile'|'organization'|'users'|'notifications'|'appearance'|'projects'|'integrations'|'security'>('profile');

  // Profile
  const [name, setName] = useState(state.user?.name || '');
  const [email, setEmail] = useState(state.user?.email || '');
  const [password, setPassword] = useState('');

  // Organization (admin)
  const [company, setCompany] = useState('My Company');
  const [timezone, setTimezone] = useState('UTC');

  // Notifications
  const [emailNotif, setEmailNotif] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);

  // Appearance
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    setName(state.user?.name || '');
    setEmail(state.user?.email || '');
  }, [state.user]);

  const saveProfile = async () => {
    try {
      const res = await axios.put('/api/settings/profile', { name, email, password }, { withCredentials: true });
      // update local auth state if API returns updated user
      if (res?.data && res.data.id) {
        // naive: reload page or update auth context by refreshing (simple approach)
        window.location.reload();
      } else {
        alert('Profile saved');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save profile');
    }
  };
  const saveOrganization = async () => {
    try {
      await axios.put('/api/settings/organization', { company, timezone }, { withCredentials: true });
      alert('Organization saved');
    } catch (err) { console.error(err); alert('Failed to save organization'); }
  };

  const saveUsers = async () => {
    try {
      // example: invite API not implemented here; backend should expose an endpoint
      await axios.post('/api/settings/users/invite', {}, { withCredentials: true });
      alert('Users updated');
    } catch (err) { console.error(err); alert('Failed to update users'); }
  };

  const saveNotifications = async () => {
    try { await axios.put('/api/settings/notifications', { emailNotif, taskReminders }, { withCredentials: true }); alert('Notifications saved'); }
    catch (err) { console.error(err); alert('Failed to save notifications'); }
  };

  const saveAppearance = async () => {
    try { await axios.put('/api/settings/appearance', { theme, language }, { withCredentials: true }); alert('Appearance saved'); }
    catch (err) { console.error(err); alert('Failed to save appearance'); }
  };

  const saveIntegrations = async () => {
    try { await axios.put('/api/settings/integrations', {}, { withCredentials: true }); alert('Integrations saved'); }
    catch (err) { console.error(err); alert('Failed to save integrations'); }
  };

  const saveSecurity = async () => {
    try { await axios.put('/api/settings/security', {}, { withCredentials: true }); alert('Security saved'); }
    catch (err) { console.error(err); alert('Failed to save security'); }
  };

  const tabs = [
    { key: 'profile', label: 'Profile' },
    ...(isAdmin ? [{ key: 'organization', label: 'Organization' }, { key: 'users', label: 'Users' }] : []),
    { key: 'notifications', label: 'Notifications' },
    ...(!isAdmin ? [{ key: 'appearance', label: 'Appearance' }] : []),
    { key: 'integrations', label: isAdmin ? 'Integrations' : 'My Integrations' },
    { key: 'security', label: 'Security' },
  ] as { key: string; label: string }[];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Settings</h2>
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex gap-6">
          <aside className="w-64">
            <nav className="space-y-1">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key as any)} className={`w-full text-left px-3 py-2 rounded ${activeTab === t.key ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}>
                  {t.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1">
            {/* Profile */}
            {activeTab === 'profile' && (
              <div>
                <div className="grid grid-cols-12 gap-4 items-center">
                  <label className="col-span-2 text-sm text-slate-700">Name</label>
                  <div className="col-span-6"><input value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-3 py-2 border rounded"/></div>
                </div>

                <div className="grid grid-cols-12 gap-4 items-center mt-4">
                  <label className="col-span-2 text-sm text-slate-700">Email</label>
                  <div className="col-span-6"><input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full px-3 py-2 border rounded"/></div>
                </div>

                <div className="grid grid-cols-12 gap-4 items-center mt-4">
                  <label className="col-span-2 text-sm text-slate-700">Password</label>
                  <div className="col-span-6"><input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" className="w-full px-3 py-2 border rounded"/></div>
                </div>

                <div className="mt-6">
                  <button onClick={saveProfile} className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
                </div>
              </div>
            )}

            {/* Organization (admin) */}
            {activeTab === 'organization' && isAdmin && (
              <div>
                <div className="grid grid-cols-12 gap-4 items-center">
                  <label className="col-span-2 text-sm text-slate-700">Company</label>
                  <div className="col-span-6"><input value={company} onChange={(e)=>setCompany(e.target.value)} className="w-full px-3 py-2 border rounded"/></div>
                </div>

                <div className="grid grid-cols-12 gap-4 items-center mt-4">
                  <label className="col-span-2 text-sm text-slate-700">Time zone</label>
                  <div className="col-span-6"><select value={timezone} onChange={(e)=>setTimezone(e.target.value)} className="w-full px-3 py-2 border rounded"><option>UTC</option><option>Asia/Kolkata</option></select></div>
                </div>

                <div className="mt-6">
                  <button onClick={saveOrganization} className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
                </div>
              </div>
            )}

            {/* Users (admin) */}
            {activeTab === 'users' && isAdmin && (
              <div>
                <div className="mb-4 text-sm text-slate-600">Invite or manage users in your organization.</div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input id="inviteEmail" placeholder="User email" className="px-3 py-2 border rounded w-64" />
                    <select id="inviteRole" className="px-3 py-2 border rounded"><option value="member">Member</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select>
                    <button onClick={async ()=>{
                      const email = (document.getElementById('inviteEmail') as HTMLInputElement).value;
                      const role = (document.getElementById('inviteRole') as HTMLSelectElement).value;
                      if(!email) { alert('Enter email'); return; }
                      try{
                        await axios.post('/api/users', { name: email.split('@')[0], email, role }, { withCredentials: true });
                        alert('User invited/created');
                      }catch(e){ console.error(e); alert('Failed to invite/create'); }
                    }} className="px-3 py-2 bg-emerald-600 text-white rounded">Invite / Create</button>
                  </div>
                </div>

                <div className="mt-6">
                  <button onClick={saveUsers} className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div>
                <div className="flex items-center gap-4"><label className="text-sm">Email notifications</label><input type="checkbox" checked={emailNotif} onChange={(e)=>setEmailNotif(e.target.checked)} /></div>
                <div className="flex items-center gap-4 mt-3"><label className="text-sm">Task reminders</label><input type="checkbox" checked={taskReminders} onChange={(e)=>setTaskReminders(e.target.checked)} /></div>

                <div className="mt-6">
                  <button onClick={saveNotifications} className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
                </div>
              </div>
            )}

            {/* Appearance (user) */}
            {activeTab === 'appearance' && !isAdmin && (
              <div>
                <div className="flex items-center gap-4"><label className="text-sm">Theme</label>
                  <select value={theme} onChange={(e)=>setTheme(e.target.value as any)} className="px-3 py-2 border rounded"><option value="light">Light</option><option value="dark">Dark</option></select>
                </div>
                <div className="flex items-center gap-4 mt-3"><label className="text-sm">Language</label>
                  <select value={language} onChange={(e)=>setLanguage(e.target.value)} className="px-3 py-2 border rounded"><option value="en">English</option><option value="hi">Hindi</option></select>
                </div>

                <div className="mt-6">
                  <button onClick={saveAppearance} className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
                </div>
              </div>
            )}

            {/* Integrations */}
            {activeTab === 'integrations' && (
              <div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded">Slack<br/><button className="mt-2 px-3 py-1 border rounded">Connect</button></div>
                  <div className="p-4 border rounded">Google Calendar<br/><button className="mt-2 px-3 py-1 border rounded">Connect</button></div>
                  <div className="p-4 border rounded">Microsoft Teams<br/><button className="mt-2 px-3 py-1 border rounded">Connect</button></div>
                </div>

                <div className="mt-6">
                  <button onClick={saveIntegrations} className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
                </div>

                {/* Admin-only server env form (safe: only visible to admins) */}
                {isAdmin && (
                  <div className="mt-8 p-4 border rounded bg-gray-50">
                    <h4 className="font-semibold mb-3">Server AI & Retention Settings (admin)</h4>
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <label className="col-span-3 text-sm text-slate-700">OpenAI API Key</label>
                      <div className="col-span-9"><input value={/* avoid keeping key in state after save */ ''} placeholder="sk_..." id="openaiKey" type="password" className="w-full px-3 py-2 border rounded" /></div>
                    </div>
                    <div className="grid grid-cols-12 gap-3 items-center mt-3">
                      <label className="col-span-3 text-sm text-slate-700">OpenAI Model</label>
                      <div className="col-span-9"><input id="openaiModel" defaultValue={process.env.REACT_APP_OPENAI_MODEL || 'gpt-3.5-turbo'} className="w-full px-3 py-2 border rounded" /></div>
                    </div>
                    <div className="grid grid-cols-12 gap-3 items-center mt-3">
                      <label className="col-span-3 text-sm text-slate-700">Enable Retention Job</label>
                      <div className="col-span-9"><select id="enableRetention" className="w-full px-3 py-2 border rounded"><option value="true">true</option><option value="false">false</option></select></div>
                    </div>
                    <div className="grid grid-cols-12 gap-3 items-center mt-3">
                      <label className="col-span-3 text-sm text-slate-700">Retention Days</label>
                      <div className="col-span-9"><input id="retentionDays" defaultValue="90" className="w-full px-3 py-2 border rounded" /></div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={async () => {
                        const openaiKey = (document.getElementById('openaiKey') as HTMLInputElement).value;
                        const openaiModel = (document.getElementById('openaiModel') as HTMLInputElement).value;
                        const enableRetention = (document.getElementById('enableRetention') as HTMLSelectElement).value;
                        const retentionDays = (document.getElementById('retentionDays') as HTMLInputElement).value;
                        try {
                          const payload: any = {};
                          if (openaiKey) payload.OPENAI_API_KEY = openaiKey;
                          if (openaiModel) payload.OPENAI_MODEL = openaiModel;
                          payload.ENABLE_RETENTION_JOB = enableRetention;
                          payload.RETENTION_DAYS = retentionDays;
                          await axios.post('/api/settings/server/env', payload, { withCredentials: true });
                          alert('Server env updated (saved to .env on server).');
                        } catch (err) {
                          console.error(err);
                          alert('Failed to update server env');
                        }
                      }} className="px-4 py-2 bg-emerald-600 text-white rounded">Save Server Settings</button>
                      <button onClick={() => { (document.getElementById('openaiKey') as HTMLInputElement).value = ''; }} className="px-4 py-2 border rounded">Clear Key</button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Note: API keys are stored server-side in <code>.env</code>. Restart may be required for immediate effect.</div>
                  </div>
                )}
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div>
                <div className="mb-4 text-sm text-slate-600">Two-factor authentication and session management.</div>
                <div className="mt-6">
                  <button onClick={saveSecurity} className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
