import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CalendarRange,
  Bus,
  ReceiptText,
  DollarSign,
  Bell,
  Clock,
  ArrowRight,
  PlusCircle,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { formatRupiah, formatTanggal, getStatusBadge } from "@/utils/formatters";
import H2NotificationModal from "@/components/H2NotificationModal";
import ReservationGanttTimeline from "@/components/ReservationGanttTimeline";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalReservations: 0,
    totalRevenue: 0,
    activeFleets: 0,
    pendingInvoices: 0,
    upcomingH2Count: 0,
  });
  const [h2List, setH2List] = useState([]);
  const [recentReservations, setRecentReservations] = useState([]);
  const [fleets, setFleets] = useState([]);
  const [allReservations, setAllReservations] = useState([]);
  const [isH2ModalOpen, setIsH2ModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await request.get(API_ENDPOINTS.DASHBOARD.STATS);
      if (statsRes.success) {
        setStats(statsRes.data);
      }

      // 2. Fetch H-2 Upcoming Reminders
      const h2Res = await request.get(API_ENDPOINTS.NOTIFICATIONS.H2_REMINDERS);
      if (h2Res.success) {
        setH2List(h2Res.data || []);
        // Auto-open modal on first load if there are upcoming H-2 orders
        if (h2Res.data && h2Res.data.length > 0 && !sessionStorage.getItem("h2_modal_shown")) {
          setIsH2ModalOpen(true);
          sessionStorage.setItem("h2_modal_shown", "true");
        }
      }

      // 3. Fetch Recent Reservations
      const resRes = await request.get(API_ENDPOINTS.RESERVATIONS.LIST, { limit: 5, page: 1 });
      if (resRes.success) {
        setRecentReservations(resRes.data || []);
      }

      // 4. Fetch Fleets and All Reservations for Gantt Timeline
      const [fleetsRes, allRes] = await Promise.all([
        request.get(API_ENDPOINTS.FLEETS.ALL),
        request.get(API_ENDPOINTS.RESERVATIONS.LIST, { limit: 200, page: 1 }),
      ]);
      if (fleetsRes.success) setFleets(fleetsRes.data || []);
      if (allRes.success) setAllReservations(allRes.data || []);
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* H-2 Notification Modal */}
      <H2NotificationModal
        isOpen={isH2ModalOpen}
        onClose={() => setIsH2ModalOpen(false)}
        upcomingList={h2List}
        onSelectOrder={(order) => {
          navigate(`/reservasi`);
        }}
      />

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Dashboard Utama
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ringkasan operasional armada & reservasi Luar Jendela Creatip
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/reservasi")}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Tambah Reservasi
          </button>
        </div>
      </div>

      {/* Prominent H-2 Departure Alert Banner */}
      {h2List.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-4 sm:p-5 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                <Bell className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg">
                  Pemberitahuan Keberangkatan H-2 ({h2List.length} Order)
                </h3>
                <p className="text-xs text-amber-100 mt-0.5 max-w-xl">
                  Terdapat armada yang dijadwalkan berangkat 2 hari ke depan. Pastikan unit dan driver siap serta pembayaran telah selesai.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsH2ModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-700 hover:bg-amber-50 text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-colors self-start sm:self-auto"
            >
              <span>Periksa Daftar H-2</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Reservasi */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-brand-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Reservasi</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            {stats.totalReservations}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Semua waktu</span>
        </div>

        {/* Card 2: Pengingat H-2 */}
        <div 
          onClick={() => setIsH2ModalOpen(true)}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Jadwal H-2</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 mt-2">
            {h2List.length}
          </p>
          <span className="text-[11px] text-amber-600 font-medium mt-1 block">
            {h2List.length > 0 ? "Klik untuk melihat" : "Tidak ada jadwal"}
          </span>
        </div>

        {/* Card 3: Armada Tersedia */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Armada Siap</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Bus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            {stats.activeFleets} Unit
          </p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Kondisi siap jalan</span>
        </div>

        {/* Card 4: Invoice Menunggu */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Invoice Pending</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ReceiptText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600 mt-2">
            {stats.pendingInvoices}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Belum Lunas / DP</span>
        </div>
      </div>

      {/* Monthly Timeline & Fleet Availability (Gantt Chart) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-brand-600" />
              <span>Timeline Ketersediaan Armada Bulan Ini</span>
            </h2>
            <p className="text-xs text-slate-500">
              Pantau jadwal sewa seluruh armada secara realtime, klik kotak putih untuk sewa langsung
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/reservasi?view=timeline")}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Buka Menu Reservasi
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <ReservationGanttTimeline
          fleets={fleets}
          reservations={allReservations}
          onSelectEmptyDate={(fleet, dateStr) => {
            navigate(`/reservasi?new=1&fleetId=${fleet.id}&date=${dateStr}&view=timeline`);
          }}
          onSelectReservation={(res) => {
            navigate(`/reservasi?view=table`);
          }}
          isLoading={isLoading || fleets.length === 0}
        />
      </div>

      {/* Recent Reservations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Reservasi Terkini
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              5 daftar booking & pemesanan armada terakhir
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/reservasi")}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Lihat Semua
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-semibold">No. Booking</th>
                <th className="py-3 px-4 font-semibold">Klien</th>
                <th className="py-3 px-4 font-semibold">Armada & Rute</th>
                <th className="py-3 px-4 font-semibold">Tanggal Pakai</th>
                <th className="py-3 px-4 font-semibold text-right">Total Biaya</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Belum ada data reservasi.
                  </td>
                </tr>
              ) : (
                recentReservations.map((res) => {
                  const badge = getStatusBadge(res.status);
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {res.reservation_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {res.client_name}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{res.fleet_name}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {res.destination}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatTanggal(res.usage_date)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {formatRupiah(res.total_price)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
