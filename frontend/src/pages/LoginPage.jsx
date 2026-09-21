import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, User, Loader2, ArrowRight } from "lucide-react";
import logoImg from "@/assets/logo.png";
import bgLoginImg from "@/assets/bg-login.jpeg";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Mohon isi username dan password!");
      return;
    }

    setIsLoading(true);
    try {
      const res = await request.post(API_ENDPOINTS.AUTH.LOGIN, {
        username,
        password,
      });

      if (res.success && res.token) {
        localStorage.setItem("ljc_token", res.token);
        localStorage.setItem("ljc_user", JSON.stringify(res.user));
        toast.success(`Selamat datang, ${res.user.name}!`);
        navigate("/");
      } else {
        toast.error(res.message || "Gagal melakukan login.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Terjadi kesalahan saat login.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-slate-900 overflow-hidden font-sans">
      {/* Background Image requested by client */}
      <img
        src={bgLoginImg}
        alt="Background Luar Jendela"
        className="absolute inset-0 h-full w-full object-cover object-center filter brightness-50 scale-105 transform animate-pulse duration-10000"
      />
      {/* Dark overlay with subtle blue gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/70 to-slate-950/80" />

      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl bg-white/90 p-8 shadow-2xl backdrop-blur-xl border border-white/40">
          {/* Brand Logo & Title */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100 mb-3">
              <img
                src={logoImg}
                alt="Logo Luar Jendela Creatip"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Luar Jendela Creatip
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Sistem Manajemen Reservasi & Armada Bus Pariwisata
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username atau Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-800 transition-all placeholder:text-slate-400 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-800 transition-all placeholder:text-slate-400 shadow-xs"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Credential Hint */}
          <div className="mt-6 pt-4 border-t border-slate-200/60 text-center">
            <p className="text-[11px] text-slate-500">
              Demo Akses Default: <strong className="text-slate-700">admin</strong> / <strong className="text-slate-700">admin123</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
