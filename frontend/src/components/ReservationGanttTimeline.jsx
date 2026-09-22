import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Bus,
  MapPin,
  Phone,
  User,
  Clock,
  Info,
  Compass,
} from "lucide-react";
import { formatRupiah, formatTanggalShort } from "@/utils/formatters";

// Helper: Format Date to YYYY-MM-DD in local time
export const toLocalDateString = (dateInput) => {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to determine status color category per client specification:
// - Red: Booking, belum DP (status === 'Booking' or down_payment === 0)
// - Yellow: Booking dan sudah DP (status === 'DP' or down_payment > 0 & not LUNAS)
// - Green: Lunas (status === 'LUNAS' or status === 'Selesai')
export const getReservationStatusCategory = (res) => {
  if (!res) return null;
  const statusUpper = (res.status || "").toUpperCase();
  const dpAmount = Number(res.down_payment || 0);
  const totalPrice = Number(res.total_price || 0);

  if (statusUpper === "LUNAS" || statusUpper === "SELESAI" || (totalPrice > 0 && dpAmount >= totalPrice)) {
    return {
      type: "lunas",
      label: "Lunas",
      shortLabel: "Lunas",
      colorClass: "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      dotClass: "bg-emerald-500",
    };
  }

  if (statusUpper === "DP" || dpAmount > 0) {
    return {
      type: "dp",
      label: "Sudah DP",
      shortLabel: "DP",
      colorClass: "bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-500",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
      dotClass: "bg-amber-400",
    };
  }

  return {
    type: "booking",
    label: "Booking (Belum DP)",
    shortLabel: "Booking",
    colorClass: "bg-rose-500 hover:bg-rose-600 text-white border-rose-600",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    dotClass: "bg-rose-500",
  };
};

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function ReservationGanttTimeline({
  fleets = [],
  reservations = [],
  onSelectEmptyDate,
  onSelectReservation,
  isLoading = false,
}) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Tooltip Popover State
  const [tooltipData, setTooltipData] = useState(null); // { res, x, y, category }
  const tableContainerRef = useRef(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
    setTooltipData(null);
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
    setTooltipData(null);
  };

  const handleCurrentMonth = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setTooltipData(null);
  };

  // Generate days for current view month
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days = [];
    const todayStr = toLocalDateString(today);

    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(viewYear, viewMonth, day);
      const dateStr = toLocalDateString(d);
      const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = dateStr === todayStr;

      days.push({
        dayNumber: day,
        dayName: NAMA_HARI[dayOfWeek],
        dateStr,
        isWeekend,
        isToday,
      });
    }
    return days;
  }, [viewYear, viewMonth]);

  // Index active reservations by fleet_id for fast lookup
  const reservationsByFleet = useMemo(() => {
    const map = new Map();
    (reservations || []).forEach((r) => {
      // Exclude cancelled bookings
      if ((r.status || "").toUpperCase() === "BATAL") return;
      if (!r.fleet_id) return;

      const fleetId = Number(r.fleet_id);
      if (!map.has(fleetId)) {
        map.set(fleetId, []);
      }

      const startStr = toLocalDateString(r.usage_date);
      const endStr = toLocalDateString(r.end_date || r.usage_date);

      map.get(fleetId).push({
        ...r,
        startStr,
        endStr: endStr < startStr ? startStr : endStr,
        category: getReservationStatusCategory(r),
      });
    });
    return map;
  }, [reservations]);

  // Quick stats for current view month
  const monthlyStats = useMemo(() => {
    const activeResSet = new Set();
    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

    (reservations || []).forEach((r) => {
      if ((r.status || "").toUpperCase() === "BATAL") return;
      const startStr = toLocalDateString(r.usage_date);
      const endStr = toLocalDateString(r.end_date || r.usage_date);

      if (startStr.startsWith(monthPrefix) || endStr.startsWith(monthPrefix)) {
        activeResSet.add(r.id);
      }
    });

    return {
      totalFleets: fleets.length,
      activeReservationsCount: activeResSet.size,
    };
  }, [reservations, fleets, viewYear, viewMonth]);

  // Horizontal Scroll helpers
  const handleScrollBy = (amount) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const handleScrollToToday = () => {
    if (tableContainerRef.current) {
      const todayIndex = daysInMonth.findIndex((d) => d.isToday);
      if (todayIndex !== -1) {
        const isMobile = window.innerWidth < 640;
        const dayWidth = isMobile ? 36 : 42;
        const scrollTarget = todayIndex * dayWidth - (isMobile ? 10 : 80);
        tableContainerRef.current.scrollTo({
          left: Math.max(0, scrollTarget),
          behavior: "smooth",
        });
      }
    }
  };

  // Auto-scroll to today when viewing current month
  useEffect(() => {
    const timer = setTimeout(() => {
      handleScrollToToday();
    }, 150);
    return () => clearTimeout(timer);
  }, [viewMonth, viewYear]);

  // Tooltip Hover Handlers
  const handleMouseEnterBar = (e, res, category) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    // Clamp X within screen bounds so tooltip never overflows mobile viewport
    const clampedX = Math.max(155, Math.min(window.innerWidth - 155, centerX));
    setTooltipData({
      res,
      category,
      x: clampedX,
      y: rect.top,
    });
  };

  const handleMouseLeaveBar = () => {
    setTooltipData(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* ===== HEADER CONTROLS & LEGEND ===== */}
      <div className="p-3 sm:p-5 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Left: Month Navigator */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-xs p-0.5 sm:p-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 sm:p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <div className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-xs sm:text-sm font-extrabold text-slate-900 min-w-[120px] sm:min-w-[140px] text-center flex items-center justify-center gap-1 sm:gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600" />
                <span>{NAMA_BULAN[viewMonth]} {viewYear}</span>
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 sm:p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCurrentMonth}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Bulan Ini
            </button>

            {/* Mobile Scroll Helpers: Pan Left, Pan Right, Jump to Today */}
            <div className="flex items-center gap-1 sm:hidden ml-auto">
              <button
                type="button"
                onClick={() => handleScrollBy(-110)}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs shadow-2xs cursor-pointer"
                title="Geser Kiri"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleScrollToToday}
                className="px-2 py-1 bg-brand-50 border border-brand-200 text-brand-700 font-bold text-[10px] rounded-lg shadow-2xs cursor-pointer"
                title="Lompat ke Hari Ini"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleScrollBy(110)}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs shadow-2xs cursor-pointer"
                title="Geser Kanan"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Legend Indicators */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 sm:pb-0 no-scrollbar text-xs">
            <span className="font-bold text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider shrink-0 hidden sm:inline">
              Status:
            </span>
            {/* Red */}
            <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-rose-50 border border-rose-200/60 text-rose-800 font-medium text-[10px] sm:text-[11px] shrink-0">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs" />
              <span className="hidden sm:inline">Booking (Belum DP)</span>
              <span className="sm:hidden">Belum DP</span>
            </div>
            {/* Yellow */}
            <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-900 font-medium text-[10px] sm:text-[11px] shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs" />
              <span>Sudah DP</span>
            </div>
            {/* Green */}
            <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-800 font-medium text-[10px] sm:text-[11px] shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
              <span>Lunas</span>
            </div>
            {/* White */}
            <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium text-[10px] sm:text-[11px] shadow-2xs shrink-0">
              <span className="w-2 h-2 rounded-xs bg-white border border-slate-400" />
              <span className="hidden sm:inline">Tersedia (Klik Sel)</span>
              <span className="sm:hidden">Kosong</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== GANTT TIMELINE TABLE CONTAINER ===== */}
      <div
        ref={tableContainerRef}
        className="relative overflow-x-auto overflow-y-visible max-h-[620px] custom-scrollbar select-none touch-pan-x"
        onScroll={() => setTooltipData(null)}
      >
        <table className="w-full border-collapse text-left min-w-max">
          {/* Table Header: Days of the Month */}
          <thead className="bg-slate-50 sticky top-0 z-20 shadow-xs">
            <tr>
              {/* Sticky Fleet Header Column (Responsive Width: 105px on mobile, 220px on desktop) */}
              <th className="sticky left-0 z-30 bg-slate-100 border-r border-b border-slate-200 p-2 sm:p-3 w-[105px] sm:w-[220px] min-w-[105px] sm:min-w-[220px] max-w-[110px] sm:max-w-[240px] text-xs font-bold text-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Bus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold truncate">Armada ({fleets.length})</span>
                </div>
              </th>

              {/* Day Columns Header */}
              {daysInMonth.map((day) => (
                <th
                  key={day.dateStr}
                  className={`border-b border-r border-slate-200 p-1 sm:p-1.5 text-center w-[35px] sm:w-[42px] min-w-[35px] sm:min-w-[42px] transition-colors ${
                    day.isToday
                      ? "bg-brand-50/90 text-brand-900 ring-1 ring-inset ring-brand-400 font-extrabold"
                      : day.isWeekend
                      ? "bg-slate-100/70 text-slate-500"
                      : "bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] uppercase font-semibold opacity-70">
                    {day.dayName}
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold mt-0.5">
                    {day.dayNumber}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body: Fleet Rows */}
          <tbody className="divide-y divide-slate-100">
            {fleets.length === 0 ? (
              <tr>
                <td
                  colSpan={daysInMonth.length + 1}
                  className="py-12 text-center text-slate-400 text-xs"
                >
                  Tidak ada data armada yang tersedia.
                </td>
              </tr>
            ) : (
              fleets.map((fleet) => {
                const fleetResList = reservationsByFleet.get(Number(fleet.id)) || [];

                return (
                  <tr
                    key={fleet.id}
                    className="hover:bg-slate-50/40 transition-colors group/row"
                  >
                    {/* Sticky Fleet Name & Plate Column (Compact on mobile) */}
                    <td className="sticky left-0 z-10 bg-white group-hover/row:bg-slate-50/95 border-r border-slate-200 p-1.5 sm:p-2.5 w-[105px] sm:w-[220px] min-w-[105px] sm:min-w-[220px] max-w-[110px] sm:max-w-[240px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                      <div className="flex items-center gap-1.5 sm:gap-2.5">
                        {/* Avatar hidden on mobile to give full space to fleet name */}
                        <div className="hidden sm:flex w-8 h-8 rounded-xl bg-brand-50 border border-brand-100 items-center justify-center text-brand-600 shrink-0 font-bold text-xs">
                          {fleet.seat_capacity || 31}
                        </div>
                        <div className="min-w-0 flex-1 pr-0.5">
                          <p
                            className="text-[11px] sm:text-xs font-bold text-slate-900 line-clamp-2 sm:truncate leading-tight"
                            title={fleet.name}
                          >
                            {fleet.name}
                          </p>
                          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                            <span className="font-semibold text-slate-700 truncate">
                              {fleet.license_plate && fleet.license_plate !== "null"
                                ? fleet.license_plate
                                : "No Plat"}
                            </span>
                            <span>•</span>
                            <span className="shrink-0">{fleet.seat_capacity || 31}s</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Day Cells for this Fleet */}
                    {daysInMonth.map((day) => {
                      const dateStr = day.dateStr;

                      // Check if there is an active reservation on this date
                      const currentRes = fleetResList.find(
                        (r) => r.startStr <= dateStr && dateStr <= r.endStr
                      );

                      if (currentRes) {
                        const isStart = currentRes.startStr === dateStr;
                        const isEnd = currentRes.endStr === dateStr;
                        const category = currentRes.category;

                        return (
                          <td
                            key={dateStr}
                            className={`p-0 border-r border-slate-200/60 relative align-middle w-[35px] sm:w-[42px] min-w-[35px] sm:min-w-[42px] ${
                              day.isWeekend ? "bg-slate-50/50" : "bg-white"
                            }`}
                          >
                            <div
                              onClick={() => {
                                if (onSelectReservation) {
                                  onSelectReservation(currentRes);
                                }
                              }}
                              onMouseEnter={(e) =>
                                handleMouseEnterBar(e, currentRes, category)
                              }
                              onMouseLeave={handleMouseLeaveBar}
                              className={`h-9 sm:h-10 flex items-center justify-center cursor-pointer transition-all duration-150 px-0.5 sm:px-1 ${
                                category.colorClass
                              } ${isStart ? "rounded-l-md ml-0.5" : ""} ${
                                isEnd ? "rounded-r-md mr-0.5" : ""
                              } ${
                                !isStart && !isEnd ? "rounded-none" : ""
                              } shadow-2xs border-y border-transparent`}
                              title={`${currentRes.client_name} - ${currentRes.destination}`}
                            >
                              {/* Display brief text only on the start date or single-day */}
                              {isStart && (
                                <span className="text-[9px] sm:text-[10px] font-bold truncate max-w-[90px] sm:max-w-[120px] pointer-events-none drop-shadow-2xs">
                                  {currentRes.destination || currentRes.client_name}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // ⬜ Area Putih Polos: Tanggal Kosong (Tersedia)
                      return (
                        <td
                          key={dateStr}
                          onClick={() => {
                            if (onSelectEmptyDate) {
                              onSelectEmptyDate(fleet, dateStr);
                            }
                          }}
                          className={`p-0 border-r border-slate-200/60 text-center align-middle cursor-pointer transition-colors duration-150 w-[35px] sm:w-[42px] min-w-[35px] sm:min-w-[42px] group/cell ${
                            day.isWeekend ? "bg-slate-50/50 hover:bg-emerald-50/80" : "bg-white hover:bg-emerald-50/80"
                          }`}
                          title={`Tersedia: Klik untuk buat reservasi baru tanggal ${formatTanggalShort(dateStr)} pada armada ${fleet.name}`}
                        >
                          <div className="h-9 sm:h-10 flex items-center justify-center">
                            <span className="opacity-0 group-hover/cell:opacity-100 transition-opacity transform group-hover/cell:scale-110 text-emerald-600">
                              <Plus className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ===== FOOTER INSTRUCTION & SUMMARY ===== */}
      <div className="p-2.5 sm:p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] sm:text-xs text-slate-500 gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600 shrink-0" />
          <span>
            <strong className="text-slate-700">Tips:</strong> Klik kotak putih untuk input sewa baru. Arahkan kursor / tap balok untuk info cepat.
          </span>
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
          Total {fleets.length} Armada • {monthlyStats.activeReservationsCount} Reservasi di {NAMA_BULAN[viewMonth]} {viewYear}
        </div>
      </div>

      {/* ===== FLOATING HOVER CARD / POPUP ===== */}
      {tooltipData && tooltipData.res && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 w-[270px] sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-3 sm:p-4 transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{
            left: `${tooltipData.x}px`,
            top: `${tooltipData.y - 8}px`,
          }}
        >
          {/* Header Status & No. Reservasi */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${tooltipData.category.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tooltipData.category.dotClass}`} />
              {tooltipData.category.label}
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-semibold">
              {tooltipData.res.reservation_number || "RSV"}
            </span>
          </div>

          {/* Quick Info Content as per user requirement */}
          <div className="space-y-1 sm:space-y-1.5 text-xs">
            {/* Nama Klien */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 flex items-center gap-1 text-[10px] sm:text-[11px] shrink-0">
                <User className="w-3 h-3 text-slate-400" /> Klien:
              </span>
              <span className="font-bold text-slate-900 text-right truncate">
                {tooltipData.res.client_name || "-"}
              </span>
            </div>

            {/* No HP */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 flex items-center gap-1 text-[10px] sm:text-[11px] shrink-0">
                <Phone className="w-3 h-3 text-slate-400" /> No HP:
              </span>
              <span className="font-semibold text-slate-800 font-mono text-right text-[11px]">
                {tooltipData.res.client_phone || tooltipData.res.pic_phone || "-"}
              </span>
            </div>

            {/* Tujuan (Rute) */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 flex items-center gap-1 text-[10px] sm:text-[11px] shrink-0">
                <MapPin className="w-3 h-3 text-slate-400" /> Tujuan:
              </span>
              <span className="font-bold text-brand-700 text-right truncate">
                {tooltipData.res.destination || "-"}
              </span>
            </div>

            {/* Periode Tanggal Sewa */}
            <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
              <span className="text-slate-500 flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-slate-400" /> Jadwal:
              </span>
              <span className="text-slate-700 font-medium text-right">
                {formatTanggalShort(tooltipData.res.usage_date)}
                {tooltipData.res.end_date && tooltipData.res.end_date !== tooltipData.res.usage_date
                  ? ` - ${formatTanggalShort(tooltipData.res.end_date)}`
                  : ""}
              </span>
            </div>

            {/* Pricing Details */}
            <div className="pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] sm:text-[10px] text-slate-500">Harga Sewa</p>
                <p className="font-bold text-slate-900 font-mono text-xs">
                  {formatRupiah(tooltipData.res.total_price)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] sm:text-[10px] text-slate-500">DP Masuk</p>
                <p className="font-extrabold text-emerald-600 font-mono text-xs">
                  {formatRupiah(tooltipData.res.down_payment)}
                </p>
              </div>
            </div>
          </div>

          {/* Subtext */}
          <div className="mt-2 pt-1 border-t border-slate-100/70 text-[9px] sm:text-[10px] text-center text-slate-500 font-medium">
            💡 Klik / tap balok untuk membuka rincian lengkap
          </div>
        </div>
      )}
    </div>
  );
}
