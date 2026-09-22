import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  User,
  Phone,
  FileText,
  CreditCard,
  CheckCircle,
  Loader2,
  UserPlus,
  Users as UsersIcon,
  Table,
  CalendarRange,
} from "lucide-react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { formatRupiah, formatTanggal, getStatusBadge } from "@/utils/formatters";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import ReservationGanttTimeline from "@/components/ReservationGanttTimeline";

// Helper: Calculate total duration in days
export const calculateDurationDays = (start, end) => {
  if (!start) return 1;
  const s = new Date(start);
  const e = end ? new Date(end) : new Date(start);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, isNaN(diff) ? 1 : diff);
};

export default function ReservasiPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState(() => searchParams.get("view") || "timeline");
  const [allReservations, setAllReservations] = useState([]);

  const [reservations, setReservations] = useState([]);
  const [clients, setClients] = useState([]);
  const [fleets, setFleets] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form State for Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [clientInputMode, setClientInputMode] = useState("existing"); // "existing" | "direct"
  const [currentId, setCurrentId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState(null);

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialForm = {
    client_id: "",
    new_client_name: "",
    new_client_phone: "",
    new_client_address: "",
    fleet_id: "",
    usage_date: "",
    end_date: "",
    due_date: "",
    pickup_time: "06:30",
    pickup_address: "",
    destination: "",
    pic_name: "",
    pic_phone: "",
    seat_count: 31,
    total_price: "",
    down_payment: "",
    status: "Booking",
    notes: "",
    include_ppn: false,
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch dropdown options for Client and Fleets
  const fetchDropdownData = async () => {
    try {
      const [cRes, fRes] = await Promise.all([
        request.get(API_ENDPOINTS.CLIENTS.ALL),
        request.get(API_ENDPOINTS.FLEETS.ALL),
      ]);
      if (cRes.success) setClients(cRes.data || []);
      if (fRes.success) setFleets(fRes.data || []);
    } catch (err) {
      console.error("Dropdown fetch error:", err);
    }
  };

  // Fetch All Reservations for Gantt Timeline View
  const fetchAllReservations = useCallback(async () => {
    try {
      const res = await request.get(API_ENDPOINTS.RESERVATIONS.LIST, { limit: 200, page: 1 });
      if (res.success) {
        setAllReservations(res.data || []);
      }
    } catch (err) {
      console.error("Fetch all reservations error:", err);
    }
  }, []);

  // Fetch Reservations
  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit,
        search,
        status: statusFilter,
        startDate: filterStartDate ? filterStartDate.toISOString().split("T")[0] : "",
        endDate: filterEndDate ? filterEndDate.toISOString().split("T")[0] : "",
      };
      const res = await request.get(API_ENDPOINTS.RESERVATIONS.LIST, params);
      if (res.success) {
        setReservations(res.data || []);
        if (res.pagination) {
          setTotalItems(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        }
      }
    } catch (err) {
      toast.error("Gagal memuat data reservasi.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  useEffect(() => {
    fetchDropdownData();
    fetchAllReservations();
  }, [fetchAllReservations]);

  // Open Create modal with prefilled data if requested from URL query or Gantt click
  useEffect(() => {
    const isNew = searchParams.get("new");
    const paramFleetId = searchParams.get("fleetId");
    const paramDate = searchParams.get("date");
    if (isNew && paramFleetId && paramDate && fleets.length > 0) {
      const matchedFleet = fleets.find((f) => String(f.id) === String(paramFleetId));
      handleOpenCreate({
        fleet_id: paramFleetId,
        usage_date: paramDate,
        end_date: paramDate,
        due_date: paramDate,
        seat_count: matchedFleet ? matchedFleet.seat_capacity : 31,
      });
      searchParams.delete("new");
      searchParams.delete("fleetId");
      searchParams.delete("date");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, fleets]);

  const handleOpenCreate = (prefillData = {}) => {
    setModalMode("create");
    setClientInputMode("existing");
    setFormData({
      ...initialForm,
      ...prefillData,
    });
    setIsModalOpen(true);
  };

  const handleSelectEmptyDate = (fleet, dateStr) => {
    handleOpenCreate({
      fleet_id: fleet.id,
      usage_date: dateStr,
      end_date: dateStr,
      due_date: dateStr,
      seat_count: fleet.seat_capacity || 31,
    });
  };

  const handleSelectReservation = (res) => {
    setSelectedRes(res);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (res) => {
    setModalMode("edit");
    setClientInputMode("existing");
    setCurrentId(res.id);
    setFormData({
      client_id: res.client_id,
      new_client_name: "",
      new_client_phone: "",
      new_client_address: "",
      fleet_id: res.fleet_id,
      usage_date: res.usage_date ? res.usage_date.split("T")[0] : "",
      end_date: res.end_date ? res.end_date.split("T")[0] : "",
      due_date: res.due_date ? res.due_date.split("T")[0] : (res.usage_date ? res.usage_date.split("T")[0] : ""),
      pickup_time: res.pickup_time || "06:30",
      pickup_address: res.pickup_address || "",
      destination: res.destination || "",
      pic_name: res.pic_name || "",
      pic_phone: res.pic_phone || "",
      seat_count: res.seat_count || 31,
      total_price: res.total_price || "",
      down_payment: res.down_payment || "",
      status: res.status || "Booking",
      notes: res.notes || "",
      include_ppn: false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (clientInputMode === "existing" && !formData.client_id) {
      toast.error("Mohon pilih klien atau beralih ke Input Klien Baru!");
      return;
    }
    if (clientInputMode === "direct" && !formData.new_client_name) {
      toast.error("Mohon masukkan nama klien baru!");
      return;
    }
    if (!formData.fleet_id || !formData.usage_date || !formData.destination || !formData.pic_name || !formData.pic_phone) {
      toast.error("Mohon lengkapi seluruh field wajib (Armada, Tgl Berangkat, Tujuan, PIC & No HP)!");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        const payload = {
          ...formData,
          // If direct mode, auto-fill PIC info if empty
          pic_name: formData.pic_name || formData.new_client_name,
          pic_phone: formData.pic_phone || formData.new_client_phone,
          pickup_address: formData.pickup_address || formData.new_client_address,
        };
        const res = await request.post(API_ENDPOINTS.RESERVATIONS.CREATE, payload);
        if (res.success) {
          toast.success(res.message || "Reservasi berhasil dibuat dan invoice otomatis diterbitkan!");
          setIsModalOpen(false);
          fetchDropdownData(); // refresh clients list
          fetchReservations();
          fetchAllReservations();
        }
      } else {
        const res = await request.put(API_ENDPOINTS.RESERVATIONS.UPDATE(currentId), formData);
        if (res.success) {
          toast.success(res.message || "Reservasi berhasil diperbarui!");
          setIsModalOpen(false);
          fetchReservations();
          fetchAllReservations();
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menyimpan reservasi.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatus = async (id, newStatus) => {
    try {
      const res = await request.patch(API_ENDPOINTS.RESERVATIONS.UPDATE_STATUS(id), { status: newStatus });
      if (res.success) {
        toast.success(`Status diubah menjadi ${newStatus}`);
        fetchReservations();
        fetchAllReservations();
      }
    } catch {
      toast.error("Gagal mengubah status.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await request.delete(API_ENDPOINTS.RESERVATIONS.DELETE(deleteTargetId));
      if (res.success) {
        toast.success("Reservasi berhasil dihapus.");
        setIsDeleteDialogOpen(false);
        fetchReservations();
        fetchAllReservations();
      }
    } catch {
      toast.error("Gagal menghapus reservasi.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper auto fill PIC from selected Client if empty
  const handleClientChange = (clientId) => {
    const selected = clients.find((c) => String(c.id) === String(clientId));
    setFormData((prev) => ({
      ...prev,
      client_id: clientId,
      pic_name: prev.pic_name || (selected ? selected.name : ""),
      pic_phone: prev.pic_phone || (selected ? selected.phone : ""),
      pickup_address: prev.pickup_address || (selected ? selected.address : ""),
    }));
  };

  // Auto fill seat count from selected Fleet
  const handleFleetChange = (fleetId) => {
    const selected = fleets.find((f) => String(f.id) === String(fleetId));
    setFormData((prev) => ({
      ...prev,
      fleet_id: fleetId,
      seat_count: selected ? selected.seat_capacity : prev.seat_count,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Data Reservasi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola jadwal booking bus, penugasan armada, dan status pembayaran
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setViewMode("table");
                setSearchParams({ view: "table" }, { replace: true });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Daftar Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("timeline");
                setSearchParams({ view: "timeline" }, { replace: true });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "timeline"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Timeline Bulanan (Gantt)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenCreate()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Reservasi
          </button>
        </div>
      </div>

      {viewMode === "timeline" ? (
        <ReservationGanttTimeline
          fleets={fleets}
          reservations={allReservations.length > 0 ? allReservations : reservations}
          onSelectEmptyDate={handleSelectEmptyDate}
          onSelectReservation={handleSelectReservation}
          isLoading={isLoading}
        />
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="w-full lg:w-72">
              <SearchInput
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Cari no. booking, tujuan, PIC, klien..."
              />
            </div>

            {/* Date Filter with React Datepicker */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
                <CalendarDays className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <DatePicker
                  selected={filterStartDate}
                  onChange={(date) => {
                    setFilterStartDate(date);
                    setPage(1);
                  }}
                  selectsStart
                  startDate={filterStartDate}
                  endDate={filterEndDate}
                  placeholderText="Tgl Mulai"
                  dateFormat="dd/MM/yyyy"
                  className="bg-transparent border-none outline-none w-24 text-xs"
                />
                <span className="text-slate-400">-</span>
                <DatePicker
                  selected={filterEndDate}
                  onChange={(date) => {
                    setFilterEndDate(date);
                    setPage(1);
                  }}
                  selectsEnd
                  startDate={filterStartDate}
                  endDate={filterEndDate}
                  minDate={filterStartDate}
                  placeholderText="Tgl Selesai"
                  dateFormat="dd/MM/yyyy"
                  className="bg-transparent border-none outline-none w-24 text-xs"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 font-medium"
              >
                <option value="">Semua Status</option>
                <option value="Booking">Booking</option>
                <option value="DP">DP</option>
                <option value="LUNAS">LUNAS</option>
                <option value="Selesai">Selesai</option>
                <option value="Batal">Batal</option>
              </select>

              {(search || statusFilter || filterStartDate || filterEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setFilterStartDate(null);
                    setFilterEndDate(null);
                    setPage(1);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-100 font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">No. Booking</th>
                    <th className="py-3.5 px-4">Klien & PIC</th>
                    <th className="py-3.5 px-4">Armada & Rute</th>
                    <th className="py-3.5 px-4">Jadwal Pakai</th>
                    <th className="py-3.5 px-4 text-right">Total Biaya</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                        <p className="text-xs">Memuat data reservasi...</p>
                      </td>
                    </tr>
                  ) : reservations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        Tidak ada data reservasi ditemukan.
                      </td>
                    </tr>
                  ) : (
                    reservations.map((r) => {
                      const badge = getStatusBadge(r.status);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            {r.reservation_number}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{r.client_name}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3" />
                              PIC: {r.pic_name} ({r.pic_phone})
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-800">{r.fleet_name}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {r.destination}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs">
                            <div className="font-medium text-slate-900">
                              {formatTanggal(r.usage_date)}
                            </div>
                            {r.end_date && r.end_date !== r.usage_date && (
                              <div className="text-[11px] text-slate-500">
                                s/d {formatTanggal(r.end_date)}
                              </div>
                            )}
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded">
                              ⏱️ {calculateDurationDays(r.usage_date, r.end_date)} Hari
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs">
                            <div className="font-bold text-slate-900">
                              {formatRupiah(r.total_price)}
                            </div>
                            {Number(r.down_payment) > 0 && (
                              <div className="text-[11px] text-emerald-600 font-medium">
                                DP: {formatRupiah(r.down_payment)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                                {badge.label}
                              </span>

                              {/* Quick status dropdown */}
                              <select
                                value={r.status}
                                onChange={(e) => handleQuickStatus(r.id, e.target.value)}
                                className="text-[10px] text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 bg-white cursor-pointer hover:border-slate-300"
                              >
                                <option value="Booking">Booking</option>
                                <option value="DP">DP</option>
                                <option value="LUNAS">LUNAS</option>
                                <option value="Selesai">Selesai</option>
                                <option value="Batal">Batal</option>
                              </select>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRes(r);
                                  setIsDetailOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                                title="Detail Reservasi"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(r)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit Reservasi"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTargetId(r.id);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus Reservasi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Server-side Pagination */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(lim) => {
                setLimit(lim);
                setPage(1);
              }}
            />
          </div>
        </>
      )}

      {/* Modal Create / Edit Reservasi */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === "create" ? "Tambah Reservasi & Terbitkan Invoice" : "Edit Reservasi"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Input Klien - Pilihan / Input Langsung */}
            <div className="sm:col-span-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-sky-600" />
                  <span>Informasi Klien</span>
                </label>
                {modalMode === "create" && (
                  <div className="flex bg-white p-0.5 rounded-xl border border-slate-200 shadow-xs text-xs">
                    <button
                      type="button"
                      onClick={() => setClientInputMode("existing")}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        clientInputMode === "existing"
                          ? "bg-sky-600 text-white font-semibold shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Pilih Terdaftar
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientInputMode("direct")}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        clientInputMode === "direct"
                          ? "bg-sky-600 text-white font-semibold shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      + Input Langsung
                    </button>
                  </div>
                )}
              </div>

              {clientInputMode === "existing" ? (
                <div>
                  <select
                    value={formData.client_id}
                    onChange={(e) => handleClientChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">-- Pilih Klien Terdaftar --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nama Klien / Instansi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: PT Surya Kencana / Bpk. Rahmat"
                      value={formData.new_client_name}
                      onChange={(e) => setFormData({ ...formData, new_client_name: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      No. WhatsApp / HP Klien
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 08123456789"
                      value={formData.new_client_phone}
                      onChange={(e) => setFormData({ ...formData, new_client_phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Armada */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Armada Unit <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.fleet_id}
                onChange={(e) => handleFleetChange(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">-- Pilih Armada --</option>
                {fleets.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.license_plate ? `(${f.license_plate})` : ""} - {f.seat_capacity} Seat
                  </option>
                ))}
              </select>
            </div>

            {/* Jam Jemput */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jam Jemput <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: 06:30"
                value={formData.pickup_time}
                onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Tanggal Berangkat */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Berangkat <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.usage_date}
                onChange={(e) => setFormData({ ...formData, usage_date: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Tanggal Pulang */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Pulang
              </label>
              <input
                type="date"
                min={formData.usage_date}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Durasi Sewa Otomatis & Tanggal Jatuh Tempo */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-sky-50/70 p-3 rounded-2xl border border-sky-100">
              <div className="flex items-center justify-between p-2.5 bg-white border border-sky-200 rounded-xl shadow-xs">
                <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-600" />
                  Total Durasi Sewa:
                </span>
                <span className="bg-sky-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg shadow-xs">
                  {calculateDurationDays(formData.usage_date, formData.end_date)} Hari
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Jatuh Tempo Invoice (Due Date)
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Tujuan */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tujuan Perjalanan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Yogyakarta & Pantai Parangtritis 3H2M"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Alamat Jemput */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat / Titik Jemput <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Alamat lengkap penjemputan rombongan..."
                value={formData.pickup_address}
                onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* PIC */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama PIC Rombongan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Nama PIC"
                value={formData.pic_name}
                onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* No HP PIC */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No HP / WhatsApp PIC <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="08123456789"
                value={formData.pic_phone}
                onChange={(e) => setFormData({ ...formData, pic_phone: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Jumlah Kursi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jumlah Kursi
              </label>
              <input
                type="number"
                value={formData.seat_count}
                onChange={(e) => setFormData({ ...formData, seat_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Pemesanan
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="Booking">Booking</option>
                <option value="DP">DP</option>
                <option value="LUNAS">LUNAS</option>
                <option value="BATAL">BATAL</option>
              </select>
            </div>

            {/* Harga Total */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Total (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Contoh: 6500000"
                value={formData.total_price}
                onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
              />
            </div>

            {/* DP */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Uang Muka / DP (Rp)
              </label>
              <input
                type="number"
                placeholder="Contoh: 2000000"
                value={formData.down_payment}
                onChange={(e) => setFormData({ ...formData, down_payment: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>

          {/* Sisa bayar calculation preview */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">Perkiraan Sisa Pembayaran:</span>
            <span className="font-mono font-bold text-rose-600 text-sm">
              {formatRupiah(Math.max(0, (Number(formData.total_price) || 0) - (Number(formData.down_payment) || 0)))}
            </span>
          </div>

          {/* PPN Checklist */}
          {modalMode === "create" && (
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={formData.include_ppn}
                onChange={(e) => setFormData({ ...formData, include_ppn: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
              <span>Sertakan PPN 11% pada penerbitan invoice otomatis</span>
            </label>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {modalMode === "create" ? "Simpan & Buat Invoice" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      {selectedRes && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Detail Reservasi: ${selectedRes.reservation_number}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[11px]">Klien</span>
                <span className="font-bold text-slate-800">{selectedRes.client_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Armada Unit</span>
                <span className="font-bold text-slate-800">{selectedRes.fleet_name} {selectedRes.license_plate ? `(${selectedRes.license_plate})` : ""}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Durasi Sewa</span>
                <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block mt-0.5">
                  ⏱️ {calculateDurationDays(selectedRes.usage_date, selectedRes.end_date)} Hari
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Tgl Berangkat</span>
                <span className="font-medium text-slate-800">{formatTanggal(selectedRes.usage_date)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Tgl Pulang</span>
                <span className="font-medium text-slate-800">{formatTanggal(selectedRes.end_date || selectedRes.usage_date)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Jam Jemput</span>
                <span className="font-medium text-slate-800">{selectedRes.pickup_time || "07:00"} WIB</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Tujuan Perjalanan</span>
              <p className="font-medium text-slate-800 mt-0.5">{selectedRes.destination}</p>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Titik Jemput</span>
              <p className="text-slate-700 mt-0.5">{selectedRes.pickup_address}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[11px]">PIC Rombongan</span>
                <p className="font-medium text-slate-800">{selectedRes.pic_name} ({selectedRes.pic_phone})</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Jumlah Kursi</span>
                <p className="font-medium text-slate-800">{selectedRes.seat_count} Kursi</p>
              </div>
            </div>

            <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span>Total Harga:</span>
                <span className="font-bold">{formatRupiah(selectedRes.total_price)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Uang Muka (DP):</span>
                <span>{formatRupiah(selectedRes.down_payment)}</span>
              </div>
              <div className="flex justify-between text-rose-400 font-bold border-t border-slate-800 pt-1">
                <span>Sisa Tagihan:</span>
                <span>{formatRupiah(selectedRes.remaining_payment)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Hapus Reservasi"
        message="Apakah Anda yakin ingin menghapus data reservasi ini? Invoice dan kuitansi terkait juga akan terpengaruh."
      />
    </div>
  );
}
