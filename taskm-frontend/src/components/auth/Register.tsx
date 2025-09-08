import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, UserPlus, Mail, Lock, User, Briefcase, CheckCircle } from 'lucide-react';

interface RegisterForm {
  name: string;
  username?: string;
  email: string;
  password: string;
  confirmPassword: string;
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
      0%, 100% { box-shadow: 0 0 20px 5px rgba(16, 185, 129, 0.2), 0 0 8px 2px rgba(16, 185, 129, 0.1); }
      50% { box-shadow: 0 0 25px 7px rgba(16, 185, 129, 0.3), 0 0 10px 3px rgba(16, 185, 129, 0.2); }
    }
    .aurora-background {
      background: radial-gradient(ellipse at 70% 20%, #047857 0%, transparent 50%),
                  radial-gradient(ellipse at 30% 80%, #064e3b 0%, transparent 50%);
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
      border-radius: 0.75rem;
    }
  `}</style>
);

// Visual asset panel for the registration page
const RegisterVisual: React.FC = () => (
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
                Join the Future<br />of Productivity.
            </motion.h2>
            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                className="text-slate-300 max-w-sm"
            >
                Create your account to access a new level of team collaboration and task management.
            </motion.p>
        </div>
    </div>
);


// Main Register Component
export const Register: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { state, register: registerUser } = useAuth();
    const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<RegisterForm>();

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
    const onSubmit = async (data: RegisterForm) => await registerUser(data.name, data.username, data.email, data.password);

    React.useEffect(() => {
        if (state.registrationSuccess) {
            reset();
        }
    }, [state.registrationSuccess, reset]);

    const password = watch('password');

    return (
        <div className="min-h-screen flex font-sans bg-slate-900 text-white overflow-hidden">
            <ComponentStyles />
            <div className="fixed inset-0 aurora-background -z-10"></div>
            <div className="fixed inset-0 grid-background -z-10"></div>
            
            <RegisterVisual />

            <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
                <motion.div
                    ref={ref}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{ transformStyle: "preserve-3d", rotateX, rotateY }}
                    className="relative w-full max-w-md"
                >
                    <div className="absolute -inset-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl blur-2xl opacity-20"></div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={{ transform: "translateZ(40px)" }}
                        className="relative w-full bg-slate-800/50 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl"
                    >
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-300">Create Account</h1>
                            <p className="text-slate-400">Join the team and get started.</p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {/* Form Fields */}
                            <div className="relative input-glow-container">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input {...register('name', { required: 'Name is required' })} type="text" placeholder="Full Name" className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-white/20 rounded-lg focus:ring-0 focus:outline-none transition-all placeholder:text-slate-500 text-white" />
                            </div>
                            {errors.name && <p className="text-red-400 text-sm -mt-2 pt-1">{errors.name.message}</p>}

                            <div className="relative input-glow-container">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })} type="email" placeholder="name@company.com" className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-white/20 rounded-lg focus:ring-0 focus:outline-none transition-all placeholder:text-slate-500 text-white" />
                            </div>
                            {errors.email && <p className="text-red-400 text-sm -mt-2 pt-1">{errors.email.message}</p>}
                            
                            <div className="relative input-glow-container">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Must be at least 6 characters' } })} type={showPassword ? 'text' : 'password'} placeholder="Create a password" className="w-full pl-11 pr-12 py-3 bg-slate-900/50 border border-white/20 rounded-lg focus:ring-0 focus:outline-none transition-all placeholder:text-slate-500 text-white" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-400"><EyeOff size={20} /></button>
                            </div>
                            {errors.password && <p className="text-red-400 text-sm -mt-2 pt-1">{errors.password.message}</p>}
                            
                            <div className="relative input-glow-container">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input {...register('confirmPassword', { required: 'Please confirm password', validate: value => value === password || 'Passwords do not match' })} type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your password" className="w-full pl-11 pr-12 py-3 bg-slate-900/50 border border-white/20 rounded-lg focus:ring-0 focus:outline-none transition-all placeholder:text-slate-500 text-white" />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-400"><Eye size={20} /></button>
                            </div>
                            {errors.confirmPassword && <p className="text-red-400 text-sm -mt-2 pt-1">{errors.confirmPassword.message}</p>}

                            {state.error && <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-center">{state.error}</div>}
                            
                            <button type="submit" disabled={state.loading} className="w-full group relative flex justify-center items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-60 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.03] focus:outline-none shadow-lg hover:shadow-emerald-500/40 mt-6">
                                <UserPlus size={20} />
                                {state.loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>
                        
                        <div className="mt-6 text-center">
                            <p className="text-slate-400">Already have an account?{' '}
                                <Link to="/login" className="font-semibold text-green-400 hover:text-green-300">Sign in here</Link>
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Registration Success Modal */}
            <AnimatePresence>
                {state.registrationSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md bg-slate-800/50 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl text-center"
                        >
                             <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-white" />
                             </div>
                             <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
                             <p className="text-slate-400 mb-6">Your account is ready. Proceed to login to start your journey.</p>
                             <Link
                                to="/login"
                                className="w-full inline-block bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.03]"
                             >
                                Go to Login
                            </Link>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};