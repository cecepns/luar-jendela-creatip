import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

export default function SearchInput({
  value = "",
  onChange,
  placeholder = "Cari data...",
  debounceTime = 350,
  className = "",
}) {
  const [searchTerm, setSearchTerm] = useState(value);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== value) {
        onChange(searchTerm);
      }
    }, debounceTime);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceTime, onChange, value]);

  const handleClear = () => {
    setSearchTerm("");
    onChange("");
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition-all placeholder:text-slate-400"
      />
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          title="Hapus pencarian"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
