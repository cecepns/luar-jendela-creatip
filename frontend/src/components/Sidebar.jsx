import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Bus,
  ReceiptText,
  Users,
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
    name: "Invoice & Kwitansi",
    path: "/invoice-kwitansi",
    icon: ReceiptText,
  },
  {
    name: "Data Klien",
    path: "/klien",
    icon: Users,
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

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-20" : "w-64"}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={logoImg}
              alt="Logo"
              className="w-9 h-9 object-contain flex-shrink-0 rounded-lg"
            />
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 truncate">
                  Luar Jendela
                </span>
                <span className="text-[11px] font-semibold text-brand-600 -mt-0.5 tracking-wider">
                  CREATIP
                </span>
              </div>
            )}
          </div>

          {/* Close for mobile */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
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
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-brand-50 text-brand-700 font-semibold shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
        <div className="hidden lg:flex border-t border-slate-100 p-3 justify-end">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center justify-center p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 w-full transition-colors text-xs"
            title={isCollapsed ? "Buka Sidebar" : "Kecilkan Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <div className="flex items-center gap-2 text-slate-500 font-medium">
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
