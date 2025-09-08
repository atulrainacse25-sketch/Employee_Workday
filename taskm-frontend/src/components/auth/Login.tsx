import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Eye, EyeOff, LogIn, Mail, Lock, Briefcase, BarChart2, CheckSquare } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

// Injects all necessary CSS for the component to be self-contained
const ComponentStyles = () => (
  <style>{`
    @keyframes aurora {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes subtle-glow {
      0%, 100% { box-shadow: 0 0 20px 5px rgba(56, 189, 248, 0.2), 0 0 8px 2px rgba(56, 189, 248, 0.1); }
      50% { box-shadow: 0 0 25px 7px rgba(56, 189, 248, 0.3), 0 0 10px 3px rgba(56, 189, 248, 0.2); }
    }
    .aurora-background {
      background: radial-gradient(ellipse at 70% 20%, #0c4a6e 0%, transparent 50%),
                  radial-gradient(ellipse at 30% 80%, #581c87 0%, transparent 50%);
      background-color: #020617;
      background-size: 200% 200%;
      animation: aurora 25s ease infinite;
    }
    .grid-background {
      background-image: linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 3rem 3rem;
    }
    .input-glow-container:focus-within {
      animation: subtle-glow 2.5s infinite alternate;
      border-radius: 0.75rem; /* Ensure glow matches border radius */
    }
  `}</style>
);

// Visual asset panel with mock dashboard elements
const LoginVisual: React.FC = () => (
    <div className="w-full h-full lg:w-1/2 flex-col justify-between p-8 sm:p-12 hidden lg:flex relative overflow-hidden">
        <div className="z-10">
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex items-center gap-3 mb-12"
            >
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <Briefcase className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-wider">Employee Workday</h1>
            </motion.div>

            <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="text-5xl font-bold text-white leading-tight mb-4"
            >
                Unlock Your<br />Most Productive Day.
            </motion.h2>
            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                className="text-slate-300 max-w-sm"
            >
                Seamlessly manage tasks, track attendance, and collaborate on projects. All in one place.
            </motion.p>
        </div>

        {/* Mock Dashboard Widgets */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="w-full max-w-sm space-y-4"
        >
            <div className="h-24 bg-white/5 border border-white/10 rounded-lg p-4 flex items-end gap-2 backdrop-blur-sm animate-pulse">
                {[12, 30, 20, 45, 25].map((h, i) => (
                    <div key={i} className="w-full bg-gradient-to-t from-sky-500/50 to-sky-500/10 rounded-t-sm" style={{ height: `${h}%` }}></div>
                ))}
            </div>
             <div className="h-16 bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between backdrop-blur-sm animate-pulse delay-75">
                <div className="flex items-center gap-3">
                    <CheckSquare className="text-indigo-400" />
                    <div className="w-32 h-3 bg-slate-700 rounded"></div>
                </div>
                <div className="w-16 h-3 bg-slate-700 rounded"></div>
            </div>
        </motion.div>
    </div>
);


// Main Login Component
export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { state, login } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 300, damping: 40 });
  const ySpring = useSpring(y, { stiffness: 300, damping: 40 });

  const rotateX = useTransform(ySpring, [-0.5, 0.5], ["6.5deg", "-6.5deg"]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ["-6.5deg", "6.5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const { width, height, left, top } = rect;
    x.set((e.clientX - left) / width - 0.5);
    y.set((e.clientY - top) / height - 0.5);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  if (state.user) return <Navigate to="/dashboard" replace />;
  const onSubmit = async (data: LoginForm) => await login(data.email, data.password);

  return (
    <div className="min-h-screen flex font-sans bg-slate-900 text-white overflow-hidden">
      <ComponentStyles />
      <div className="fixed inset-0 aurora-background -z-10"></div>
      <div className="fixed inset-0 grid-background -z-10"></div>
      
      <LoginVisual />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transformStyle: "preserve-3d", rotateX, rotateY }}
            className="relative w-full max-w-md"
        >
            <div className="absolute -inset-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-2xl opacity-30"></div>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ transform: "translateZ(40px)" }}
                className="relative w-full bg-slate-800/50 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl"
            >
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-300">Welcome Back</h1>
                    <p className="text-slate-400">Sign in to your Employee Workday.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="relative input-glow-container">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }})}
                            type="email"
                            className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-white/20 rounded-lg focus:ring-0 focus:outline-none transition-all placeholder:text-slate-500 text-white"
                            placeholder="name@company.com"
                        />
                    </div>
                    {errors.email && <p className="text-red-400 text-sm -mt-3 pt-1">{errors.email.message}</p>}

                    <div className="relative input-glow-container">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            {...register('password', { required: 'Password is required' })}
                            type={showPassword ? 'text' : 'password'}
                            className="w-full pl-11 pr-12 py-3 bg-slate-900/50 border border-white/20 rounded-lg focus:ring-0 focus:outline-none transition-all placeholder:text-slate-500 text-white"
                            placeholder="Enter your password"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {errors.password && <p className="text-red-400 text-sm -mt-3 pt-1">{errors.password.message}</p>}

                    {state.error && <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-center">{state.error}</div>}
                    
                    <div className="flex items-center justify-end">
                        <Link to="/forgot-password" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">Forgot password?</Link>
                    </div>

                    <button type="submit" disabled={state.loading} className="w-full group relative flex justify-center items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.03] focus:outline-none shadow-lg hover:shadow-indigo-500/40">
                        <LogIn size={20} />
                        {state.loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
                
                <div className="mt-8 text-center">
                    <p className="text-slate-400">Don't have an account?{' '}
                        <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">Sign up here</Link>
                    </p>
                </div>
            </motion.div>
        </motion.div>
      </div>
    </div>
  );
};