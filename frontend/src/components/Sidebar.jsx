import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Bus,
  ReceiptText,
  Users,
  UserCheck,
  Building2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import logoImg from "@/assets/logo.png";

const navItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Reservasi",
    path: "/reservasi",
    icon: CalendarDays,
  },
  {
    name: "Armada",
    path: "/armada",
    icon: Bus,
  },
  {
    name: "Invoice & Kuitansi",
    path: "/invoice-kwitansi",
    icon: ReceiptText,
  },
  {
    name: "Data Klien",
    path: "/klien",
    icon: Users,
  },
  {
    name: "Pegawai",
    path: "/pegawai",
    icon: UserCheck,
  },
  {
    name: "Profil Usaha",
    path: "/profil",
    icon: Building2,
  },
];

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container — Ocean Blue Theme */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-gradient-to-b from-sky-800 via-sky-900 to-slate-900 border-r border-sky-700/30 shadow-xl transition-all duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } ${isCollapsed ? "lg:w-20" : "w-64"}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={logoImg}
              alt="Logo"
              className="w-auto h-12 object-contain flex-shrink-0 rounded-lg bg-white/90 p-0.5"
            />
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-extrabold text-sm tracking-tight text-white truncate">
                  Luar Jendela
                </span>
                <span className="text-[11px] font-semibold text-sky-300 -mt-0.5 tracking-wider">
                  CREATRIP
                </span>
              </div>
            )}
          </div>

          {/* Close for mobile */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-sky-300 hover:bg-white/10 hover:text-white lg:hidden transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${isActive
                    ? "bg-white/15 text-white font-bold shadow-md backdrop-blur-sm border-l-4 border-sky-300 pl-2.5"
                    : "text-sky-100/80 hover:bg-white/10 hover:text-white"
                  } ${isCollapsed ? "justify-center px-2" : ""}`
                }
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop Collapse Button */}
        <div className="hidden lg:flex border-t border-white/10 p-3 justify-end">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center justify-center p-2 rounded-xl text-sky-300 hover:bg-white/10 hover:text-white w-full transition-colors text-xs"
            title={isCollapsed ? "Buka Sidebar" : "Kecilkan Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <div className="flex items-center gap-2 text-sky-200 font-medium">
                <ChevronLeft className="w-4 h-4" />
                <span>Ciutkan</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
