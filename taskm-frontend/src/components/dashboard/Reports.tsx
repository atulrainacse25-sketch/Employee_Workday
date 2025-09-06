import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/useAuth';
import { useNavigate } from 'react-router-dom';
type StatusCount = { status: string; count: number };
type AssigneeCount = { name: string; count: number };
type AttendanceCount = { status: string; count: number };
type LeavesByType = { type: string; count: number };
type WfhByStatus = { status: string; count: number };
type UserReport = {
  id: number;
  name: string;
  email: string;
  tasks_count: number;
  leaves_count: number;
  wfh_count: number;
  present_count: number;
};


export const Reports: React.FC = () => {
  const [tasksByStatus, setTasksByStatus] = useState<StatusCount[]>([]);
  const [tasksByAssignee, setTasksByAssignee] = useState<AssigneeCount[]>([]);
  const [attendanceCounts, setAttendanceCounts] = useState<AttendanceCount[]>([]);
  const [leavesByType, setLeavesByType] = useState<LeavesByType[]>([]);
  const [wfhByStatus, setWfhByStatus] = useState<WfhByStatus[]>([]);
  const [usersReport, setUsersReport] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { state: authState } = useAuth();
  const [animate, setAnimate] = useState<boolean>(false);

  useEffect(() => {
    // trigger bar animations after mount
    const t = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(t);
  }, []);

  const getMax = (arr: { count: number }[]) => (arr && arr.length ? Math.max(...arr.map(a => a.count), 1) : 1);

  const getColorForKey = (key: string) => {
    const k = (key || '').toLowerCase();
    if (k.includes('todo') || k.includes('pending')) return 'bg-yellow-400';
    if (k.includes('completed') || k.includes('present') || k.includes('approved')) return 'bg-emerald-500';
    if (k.includes('absent') || k.includes('rejected')) return 'bg-red-500';
    if (k.includes('wfh') || k.includes('festival')) return 'bg-indigo-500';
    return 'bg-sky-500';
  };

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tRes, aRes, lRes, wRes] = await Promise.all([
          axios.get('/api/reports/tasks', { withCredentials: true }),
          axios.get('/api/reports/attendance', { withCredentials: true }),
          axios.get('/api/reports/leaves', { withCredentials: true }),
          axios.get('/api/reports/wfh', { withCredentials: true }),
        ]);
        setTasksByStatus(tRes.data.tasksByStatus || []);
        setTasksByAssignee(tRes.data.tasksByAssignee || []);
        setAttendanceCounts(aRes.data.attendanceCounts || []);
        setLeavesByType(lRes.data.leavesByType || []);
        setWfhByStatus(wRes.data.wfhByStatus || []);
        // fetch users report
        try {
          const uRes = await axios.get('/api/reports/users', { withCredentials: true });
          setUsersReport(uRes.data.users || []);
        } catch (e) {
          console.error('Failed to fetch users report', e);
          setError('Failed to fetch users report');
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Error fetching reports');
      } finally {
        setLoading(false);
      }
    };

    // Wait for auth initialization and admin role
    if (!authState || !authState.initialized) return;
    if (!authState.user) return;
    if (authState.user.role !== 'admin') return;
    fetchReports();
  }, [authState]);

  // Fetch AI logs for admin panel
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [aiPage, setAiPage] = useState(1);
  const [aiPageSize] = useState(20);
  const [aiTotal, setAiTotal] = useState(0);
  const [aiAction, setAiAction] = useState('');
  const [searchText, setSearchText] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const navigate = useNavigate();
  const searchDebounceRef = useRef<number | null>(null);
  const [showAdminControls, setShowAdminControls] = useState(false);
  // Fetch AI logs helper (used by effect and actions)
  const fetchAiLogs = async () => {
    try {
      const params: any = { page: aiPage, pageSize: aiPageSize };
      if (aiAction) params.action = aiAction;
      if (aiQuery) params.q = aiQuery;
      const res = await axios.get('/api/notifications/ai/logs', { params, withCredentials: true });
      if (res.status === 200) {
        setAiLogs(res.data.logs || []);
        setAiTotal(res.data.total || 0);
      }
    } catch (err) {
      // ignore
    }
  };
  useEffect(() => {
    if (authState.user && authState.user.role === 'admin') fetchAiLogs();
  }, [authState.user, aiPage, aiAction, aiQuery]);

  // debounce searchText -> aiQuery
  useEffect(() => {
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current as any);
    searchDebounceRef.current = window.setTimeout(() => {
      setAiQuery(searchText);
      setAiPage(1);
    }, 500);
    return () => { if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current as any); };
  }, [searchText]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Admin Reports</h2>
      {/* Loading / error states */}
      {loading && <div className="text-sm text-gray-600">Loading reports...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-slate-50 to-white p-6 rounded-xl shadow-md border border-slate-100">
          <h3 className="font-semibold mb-4 text-lg text-slate-700">Tasks by Status</h3>
          <div className="space-y-3">
            {tasksByStatus.map((r: StatusCount) => {
              const pct = Math.round((r.count / getMax(tasksByStatus as StatusCount[])) * 100);
              const color = getColorForKey(r.status);
              return (
                <div key={r.status} className="flex items-center gap-4">
                  <div className="w-28 text-sm text-slate-600 capitalize">{r.status}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-3 rounded-full transition-all duration-900 ${color}`} style={{ width: animate ? `${pct}%` : '6%' }} />
                  </div>
                  <div className="w-8 text-right font-semibold text-slate-700">{r.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-50 to-white p-6 rounded-xl shadow-md border border-slate-100">
          <h3 className="font-semibold mb-4 text-lg text-slate-700">Tasks by Assignee</h3>
          <div className="space-y-3">
            {tasksByAssignee.map((r: AssigneeCount) => {
              const pct = Math.round((r.count / getMax(tasksByAssignee as AssigneeCount[])) * 100);
              const color = getColorForKey(r.name);
              return (
                <div key={r.name} className="flex items-center gap-4">
                  <div className="w-28 text-sm text-slate-600">{r.name}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-3 rounded-full transition-all duration-900 ${color}`} style={{ width: animate ? `${pct}%` : '6%' }} />
                  </div>
                  <div className="w-8 text-right font-semibold text-slate-700">{r.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-50 to-white p-6 rounded-xl shadow-md border border-slate-100">
          <h3 className="font-semibold mb-4 text-lg text-slate-700">Attendance (30d)</h3>
          <div className="space-y-3">
            {attendanceCounts.map((r: AttendanceCount) => {
              const pct = Math.round((r.count / getMax(attendanceCounts as AttendanceCount[])) * 100);
              const color = getColorForKey(r.status);
              return (
                <div key={r.status} className="flex items-center gap-4">
                  <div className="w-28 text-sm text-slate-600 capitalize">{r.status}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-3 rounded-full transition-all duration-900 ${color}`} style={{ width: animate ? `${pct}%` : '6%' }} />
                  </div>
                  <div className="w-8 text-right font-semibold text-slate-700">{r.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-gradient-to-r from-white to-slate-50 p-6 rounded-xl shadow-md border border-slate-100">
          <h3 className="font-semibold mb-4 text-lg text-slate-700">Leaves by Type</h3>
          <div className="space-y-3">
            {leavesByType.map((r: LeavesByType) => {
              const pct = Math.round((r.count / getMax(leavesByType as LeavesByType[])) * 100);
              const color = getColorForKey(r.type);
              return (
                <div key={r.type} className="flex items-center gap-4">
                  <div className="w-28 text-sm text-slate-600 capitalize">{r.type}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-3 rounded-full transition-all duration-900 ${color}`} style={{ width: animate ? `${pct}%` : '6%' }} />
                  </div>
                  <div className="w-8 text-right font-semibold text-slate-700">{r.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-r from-white to-slate-50 p-6 rounded-xl shadow-md border border-slate-100">
          <h3 className="font-semibold mb-4 text-lg text-slate-700">WFH by Status</h3>
          <div className="space-y-3">
            {wfhByStatus.map((r: WfhByStatus) => {
              const pct = Math.round((r.count / getMax(wfhByStatus as WfhByStatus[])) * 100);
              const color = getColorForKey(r.status);
              return (
                <div key={r.status} className="flex items-center gap-4">
                  <div className="w-28 text-sm text-slate-600 capitalize">{r.status}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-3 rounded-full transition-all duration-900 ${color}`} style={{ width: animate ? `${pct}%` : '6%' }} />
                  </div>
                  <div className="w-8 text-right font-semibold text-slate-700">{r.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow mt-6 border border-slate-100">
        <h3 className="font-semibold mb-4 text-lg text-slate-700">Users Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase">
                <th className="py-3">Name</th>
                <th>Email</th>
                <th className="text-right">Tasks</th>
                <th className="text-right">Leaves</th>
                <th className="text-right">WFH</th>
                <th className="text-right">Present (30d)</th>
              </tr>
            </thead>
            <tbody>
              {usersReport.map((u: UserReport, idx) => (
                <tr key={u.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b`}> 
                  <td className="py-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">{(u.name || 'U').slice(0,1)}</div>
                    <div>
                      <div className="font-medium text-slate-700">{u.name}</div>
                    </div>
                  </td>
                  <td className="text-slate-600">{u.email}</td>
                  <td className="text-right font-semibold text-slate-700">{u.tasks_count}</td>
                  <td className="text-right text-slate-600">{u.leaves_count}</td>
                  <td className="text-right text-slate-600">{u.wfh_count}</td>
                  <td className="text-right font-semibold text-slate-700">{u.present_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow mt-6 border border-slate-100">
        <h3 className="font-semibold mb-4 text-lg text-slate-700">AI Logs (admin)</h3>
        <div className={showAdminControls ? 'block' : 'hidden'} aria-hidden={!showAdminControls}>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Action</label>
            <select value={aiAction} onChange={(e) => { setAiAction(e.target.value); setAiPage(1); }} className="border rounded px-2 py-1">
              <option value="">All</option>
              <option value="chat">chat</option>
              <option value="analyze">analyze</option>
              <option value="plan">plan</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search prompts/responses" className="border rounded px-2 py-1" />
            <button onClick={() => { setAiQuery(searchText); setAiPage(1); }} className="px-3 py-1 border rounded">Search</button>
            <button onClick={() => { setSearchText(''); setAiQuery(''); setAiAction(''); setAiPage(1); }} className="px-3 py-1 border rounded">Clear</button>
          </div>
        </div>
        <div className="mb-3">
          <button onClick={() => setShowAdminControls(s => !s)} className="px-3 py-1 border rounded text-sm">{showAdminControls ? 'Hide admin controls' : 'Show admin controls'}</button>
        </div>

        <div className="max-h-56 overflow-y-auto">
          {aiLogs.length === 0 && <div className="text-sm text-gray-500">No AI logs or insufficient permissions.</div>}
          {aiLogs.map((l: any) => (
            <div key={l.id} className="border-b py-2 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium">{l.action} — {new Date(l.created_at).toLocaleString()}</div>
                <div className="text-xs text-gray-600">Prompt: {l.prompt}</div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                <button onClick={async () => {
                  try {
                    const r = await axios.get(`/api/notifications/ai/logs/${l.id}`, { withCredentials: true });
                    const data = r.data;
                    // navigate in-app to Smart Planner and pass data via state
                    navigate('/smart-planner', { state: { replay: data } });
                  } catch (err) {
                    console.warn('Failed to load log');
                  }
                }} className="text-sm px-3 py-1 border rounded">Replay</button>

                <div className="hidden" aria-hidden="true">
                  <button onClick={async () => {
                    try {
                      await axios.post(`/api/notifications/ai/logs/${l.id}/archive`, {}, { withCredentials: true });
                      await fetchAiLogs();
                    } catch (err) {
                      console.warn('Archive failed');
                    }
                  }} className="text-sm px-3 py-1 border rounded">Archive</button>

                  <button onClick={async () => {
                    try {
                      await axios.post(`/api/notifications/ai/logs/${l.id}/unarchive`, {}, { withCredentials: true });
                      await fetchAiLogs();
                    } catch (err) {
                      console.warn('Unarchive failed');
                    }
                  }} className="text-sm px-3 py-1 border rounded">Unarchive</button>

                  <button onClick={async () => {
                    try {
                      await axios.delete(`/api/notifications/ai/logs/${l.id}`, { withCredentials: true });
                      await fetchAiLogs();
                    } catch (err) {
                      console.warn('Delete failed');
                    }
                  }} className="text-sm px-3 py-1 border rounded">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Total: {aiTotal}</div>
          <div className="space-x-2">
            <button disabled={aiPage <= 1} onClick={() => setAiPage(p => Math.max(1, p-1))} className="px-2 py-1 border rounded">Prev</button>
            <button disabled={(aiPage * aiPageSize) >= aiTotal} onClick={() => setAiPage(p => p+1)} className="px-2 py-1 border rounded">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};
