import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Send, BrainCircuit, CalendarDays, Zap } from "lucide-react";
import geminiAIBG from '../assets/geminiAIBG.png'; 

const SmartPlanner = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", text: "🤖 Welcome to Smart Planner! How can I assist you with your day?" }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Detect dark mode & user login
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
    const token = localStorage.getItem("token");
    setUserLoggedIn(!!token);
  }, []);

  const addMessage = (role, text) =>
    setMessages(prev => [...prev, { id: Date.now(), role, text }]);

  const handleApiCall = async (endpoint, payload, userMessage) => {
    if (!userLoggedIn) {
      addMessage("assistant", "⚠️ Please log in to use AI actions.");
      return;
    }

    addMessage("user", userMessage);
    setInput("");
    setIsThinking(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
        timeout: 60000,
      });
      const reply = response?.data?.reply || response?.data?.plan?.plan || response?.data?.analysis?.summary || "No response.";
      addMessage("assistant", reply);
    } catch (error) {
      addMessage("assistant", "⚠️ AI service error. Please try again.");
    } finally {
      setIsThinking(false);
    }
  };

  const handleActionClick = (actionType) => {
    switch (actionType) {
      case "analyze":
        return handleApiCall("/api/ai/analyze", { context: "Analyze my current tasks." }, "Analyze my tasks");
      case "plan":
        return handleApiCall("/api/ai/plan", { preferences: { wakeUp: "7 AM", workHours: "9-5" } }, "Create a plan for my day");
      case "optimize":
        return handleApiCall("/api/ai/chat", { prompt: "Optimize my current schedule." }, "Optimize my schedule");
      default:
        return;
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleApiCall("/api/ai/chat", { prompt: input.trim() }, input.trim());
  };

  const actionButtons = [
    { id: "analyze", label: "Analyze", icon: BrainCircuit, color: "from-blue-500 to-sky-500" },
    { id: "plan", label: "Plan My Day", icon: CalendarDays, color: "from-green-500 to-emerald-500" },
    { id: "optimize", label: "Optimize", icon: Zap, color: "from-purple-500 to-violet-500" },
  ];

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-500 ${isDarkMode ? "dark" : ""}`}
      style={{
        backgroundImage: isDarkMode
          ? `linear-gradient(rgba(15,23,42,0.9), rgba(15,23,42,0.9)), url(${geminiAIBG})`
          : `linear-gradient(rgba(255,255,255,0.6), rgba(255,255,255,0.6)), url(${geminiAIBG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <header className="backdrop-blur-lg bg-white/60 dark:bg-slate-800/60 p-4 rounded-2xl shadow-lg border border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-full shadow-inner">
                <BrainCircuit className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Smart Planner</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Your AI-powered productivity partner</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {actionButtons.map(({id, label, icon: Icon, color}) => (
                <button
                    key={id}
                    onClick={() => handleActionClick(id)}
                    disabled={!userLoggedIn}
                    className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold shadow-md bg-gradient-to-r ${color} transition-transform hover:scale-105 active:scale-95 ${!userLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Icon size={16} />
                    {label}
                </button>
            ))}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 transition-colors hover:bg-white dark:hover:bg-slate-700"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Chat Interface */}
        <main className="h-[calc(100vh-200px)] flex flex-col backdrop-blur-lg bg-white/60 dark:bg-slate-800/60 p-4 rounded-2xl shadow-lg border border-white/20">
          <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
            {messages.map(m => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0"></div>}
                <div className={`max-w-[80%] p-3 px-4 rounded-2xl shadow-sm whitespace-pre-wrap break-words ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-lg' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-lg'}`}>
                  {m.text}
                </div>
              </motion.div>
            ))}
            <AnimatePresence>
              {isThinking && (
                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0"></div>
                  <div className="flex items-center gap-1.5 p-3 px-4 rounded-2xl bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    <motion.span animate={{ y: [0,-2,0] }} transition={{ duration:0.8, repeat: Infinity, ease:"easeInOut", delay:0 }} className="w-2 h-2 bg-slate-400 rounded-full" />
                    <motion.span animate={{ y: [0,-2,0] }} transition={{ duration:0.8, repeat: Infinity, ease:"easeInOut", delay:0.2 }} className="w-2 h-2 bg-slate-400 rounded-full" />
                    <motion.span animate={{ y: [0,-2,0] }} transition={{ duration:0.8, repeat: Infinity, ease:"easeInOut", delay:0.4 }} className="w-2 h-2 bg-slate-400 rounded-full" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={userLoggedIn ? "Ask Smart Planner anything..." : "Log in to ask Smart Planner"}
              className="flex-1 px-4 py-3 border-none rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || !userLoggedIn || isThinking}
              className="p-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-transform active:scale-90"
            >
              <Send size={20} />
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default SmartPlanner;
