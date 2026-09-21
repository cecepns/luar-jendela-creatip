import React from "react";
import { Menu, Bell, User, LogOut, ExternalLink } from "lucide-react";
import logoImg from "@/assets/logo.png";

export default function Navbar({
  onToggleSidebar,
  h2Count = 0,
  onOpenH2Modal,
  user,
  onLogout,
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Left Section: Mobile Toggle & Brand Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden transition-colors"
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 lg:hidden">
          <img
            src={logoImg}
            alt="Luar Jendela Creatip"
            className="w-8 h-8 object-contain rounded-lg"
          />
          <span className="font-bold text-slate-800 text-sm tracking-tight truncate">
            Luar Jendela Creatip
          </span>
        </div>
      </div>

      {/* Right Section: H-2 Alert Bell & User Profile */}
      <div className="flex items-center gap-3">
        {/* H-2 Notification Reminder Bell */}
        <button
          type="button"
          onClick={onOpenH2Modal}
          className={`relative rounded-xl p-2 transition-all ${
            h2Count > 0
              ? "bg-amber-50 text-amber-600 hover:bg-amber-100 ring-2 ring-amber-400/20"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          }`}
          title="Pengingat Keberangkatan H-2"
        >
          <Bell className="w-5 h-5" />
          {h2Count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
              {h2Count}
            </span>
          )}
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
              {user?.name || "Admin"}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">
              {user?.role || "Administrator"}
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Keluar dari Aplikasi"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
