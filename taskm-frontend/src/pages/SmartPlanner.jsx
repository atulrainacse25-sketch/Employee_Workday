import React, { useState, useRef, useEffect } from 'react';
// keep as .jsx; TypeScript declaration added in global.d.ts to silence import warnings
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const SmartPlanner = () => {
  const [messages, setMessages] = useState([
    { id: 1, role: 'system', text: 'Welcome to Smart Planner. Ask me to analyze your tasks or plan your day.' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([
    { id: 's1', title: 'Prioritize bug fixes', desc: 'Move high priority bugs to morning slot.' },
    { id: 's2', title: 'Batch reviews', desc: 'Group code reviews into a single 1 hour block.' },
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const location = useLocation();

  // Handle replayed log passed via location.state (preferred) or localStorage (fallback)
  useEffect(() => {
    try {
      const stateReplay = location && (location.state && (location.state.replay || location.state));
      let data = null;
      if (stateReplay) {
        data = stateReplay;
      } else {
        const raw = localStorage.getItem('smartPlannerReplay');
        if (raw) {
          localStorage.removeItem('smartPlannerReplay');
          data = JSON.parse(raw);
        }
      }

      if (!data) return;
      // data contains prompt, response (AI raw JSON)
      const userMsg = data.prompt || data.request || '';
      let assistantMsg = '';
      try {
        const resp = typeof data.response === 'string' ? JSON.parse(data.response) : data.response;
        assistantMsg = resp?.choices?.[0]?.message?.content || resp?.choices?.[0]?.text || JSON.stringify(resp);
      } catch (e) {
        assistantMsg = String(data.response || '');
      }
      if (userMsg) setMessages((m) => [...m, { id: Date.now() + 1, role: 'user', text: userMsg }]);
      if (assistantMsg) setMessages((m) => [...m, { id: Date.now() + 2, role: 'assistant', text: assistantMsg }]);
    } catch (e) {
      // ignore parse errors
    }
  }, [location]);

  const handleAnalyze = async () => {
    setMessages((m) => [...m, { id: Date.now(), role: 'assistant', text: 'Analyzing tasks... (calling backend)' }]);
    try {
      const res = await axios.post('/api/notifications/ai/analyze', { context: 'all_tasks' }, { withCredentials: true });
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text: res.data.analysis?.summary || 'No analysis returned' }]);
    } catch (err) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text: 'Error contacting AI backend' }]);
    }
  };

  const handlePlanDay = async () => {
    setMessages((m) => [...m, { id: Date.now(), role: 'assistant', text: 'Planning day... (calling backend)' }]);
    try {
      const res = await axios.post('/api/notifications/ai/plan', { preferences: { focusHours: 4 } }, { withCredentials: true });
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text: res.data.plan?.plan || 'No plan returned' }]);
    } catch (err) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text: 'Error contacting AI backend' }]);
    }
  };

  const handleOptimize = async () => {
    setMessages((m) => [...m, { id: Date.now(), role: 'assistant', text: 'Optimizing... (calling backend)' }]);
    try {
      const res = await axios.post('/api/notifications/ai/chat', { prompt: 'Optimize my schedule' }, { withCredentials: true });
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text: res.data.reply || 'No reply' }]);
    } catch (err) {
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text: 'Error contacting AI backend' }]);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    // add user message immediately
    const userMsg = { id: Date.now(), role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await axios.post('/api/notifications/ai/chat', { prompt: text }, { withCredentials: true, timeout: 30000 });
      const reply = res?.data?.reply || (res?.data?.log && (res.data.log.response?.choices?.[0]?.message?.content || res.data.log.response?.choices?.[0]?.text)) || 'No reply from AI';
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text: reply }]);
    } catch (err) {
      console.error('Chat send error', err);
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', text: 'Error contacting AI backend' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Planner (AI)</h1>
          <p className="text-gray-600 mt-1">AI-driven suggestions to help plan and optimize your workday.</p>
        </div>
        <div className="space-x-2">
          <button onClick={handleAnalyze} className="bg-blue-600 text-white px-4 py-2 rounded-md">Analyze Tasks</button>
          <button onClick={handlePlanDay} className="bg-green-600 text-white px-4 py-2 rounded-md">Plan My Day</button>
          <button onClick={handleOptimize} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Optimize</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg p-6 h-[60vh] flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Chat</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] p-3 rounded-md ${m.role === 'user' ? 'bg-blue-50 self-end text-right' : 'bg-gray-100 self-start'}`}>
                  <div className="text-sm text-gray-800">{m.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSend} className="mt-4 flex items-center gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Smart Planner..." className="flex-1 border rounded-md px-3 py-2" />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">Send</button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold">Suggestions</h3>
            <div className="mt-3 space-y-3">
              {suggestions.map((s) => (
                <div key={s.id} className="p-3 border rounded-md">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-gray-600">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold">Plans</h3>
            <p className="text-sm text-gray-600">Suggested plans and schedules will appear here.</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-semibold">Quick Actions</h3>
            <div className="mt-2 flex flex-col gap-2">
              <button onClick={() => {}} className="text-left px-3 py-2 border rounded-md">Mark all low priority as later</button>
              <button onClick={() => {}} className="text-left px-3 py-2 border rounded-md">Create 2-hour focus block</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartPlanner;
