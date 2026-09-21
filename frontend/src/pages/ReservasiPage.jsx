import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
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
} from "lucide-react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { formatRupiah, formatTanggal, getStatusBadge } from "@/utils/formatters";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ReservasiPage() {
  const [reservations, setReservations] = useState([]);
  const [clients, setClients] = useState([]);
  const [fleets, setFleets] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Form State for Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
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
    fleet_id: "",
    usage_date: "",
    end_date: "",
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

  // Fetch Reservations
  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit,
        search,
        status: statusFilter,
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
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res) => {
    setModalMode("edit");
    setCurrentId(res.id);
    setFormData({
      client_id: res.client_id,
      fleet_id: res.fleet_id,
      usage_date: res.usage_date ? res.usage_date.split("T")[0] : "",
      end_date: res.end_date ? res.end_date.split("T")[0] : "",
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
    if (!formData.client_id || !formData.fleet_id || !formData.usage_date || !formData.destination || !formData.pic_name || !formData.pic_phone) {
      toast.error("Mohon lengkapi seluruh field yang wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        const res = await request.post(API_ENDPOINTS.RESERVATIONS.CREATE, formData);
        if (res.success) {
          toast.success(res.message || "Reservasi berhasil dibuat dan invoice otomatis diterbitkan!");
          setIsModalOpen(false);
          fetchReservations();
        }
      } else {
        const res = await request.put(API_ENDPOINTS.RESERVATIONS.UPDATE(currentId), formData);
        if (res.success) {
          toast.success(res.message || "Reservasi berhasil diperbarui!");
          setIsModalOpen(false);
          fetchReservations();
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

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Reservasi
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="w-full sm:w-72">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Cari no. booking, tujuan, PIC, klien..."
          />
        </div>

        {/* Filter Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["", "Booking", "DP", "LUNAS", "BATAL"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {st === "" ? "Semua Status" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4 font-semibold">No. Booking</th>
                <th className="py-3.5 px-4 font-semibold">Klien & PIC</th>
                <th className="py-3.5 px-4 font-semibold">Armada & Rute</th>
                <th className="py-3.5 px-4 font-semibold">Jadwal Pakai</th>
                <th className="py-3.5 px-4 font-semibold text-right">Harga & DP</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                    Memuat data reservasi...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data reservasi yang sesuai.
                  </td>
                </tr>
              ) : (
                reservations.map((r) => {
                  const badge = getStatusBadge(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded text-xs">
                          {r.reservation_number}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {formatTanggal(r.created_at)}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{r.client_name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          {r.pic_name} ({r.pic_phone})
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">
                          {r.fleet_name} <span className="text-slate-400 font-normal">({r.seat_count} Seat)</span>
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[200px]">{r.destination}</span>
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800">
                          {formatTanggal(r.usage_date)}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {r.pickup_time || "07:00"} WIB
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <p className="font-mono font-bold text-slate-900">
                          {formatRupiah(r.total_price)}
                        </p>
                        <p className="text-[11px] font-mono text-emerald-600 mt-0.5">
                          DP: {formatRupiah(r.down_payment)}
                        </p>
                        {Number(r.remaining_payment) > 0 && (
                          <p className="text-[11px] font-mono text-rose-600">
                            Sisa: {formatRupiah(r.remaining_payment)}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={r.status}
                          onChange={(e) => handleQuickStatus(r.id, e.target.value)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border cursor-pointer focus:outline-none ${badge.bg}`}
                        >
                          <option value="Booking">Booking</option>
                          <option value="DP">DP</option>
                          <option value="LUNAS">LUNAS</option>
                          <option value="BATAL">BATAL</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRes(r);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                            title="Detail Reservasi"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
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
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
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

      {/* Modal Create / Edit Reservasi */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === "create" ? "Tambah Reservasi & Terbitkan Invoice" : "Edit Reservasi"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Klien */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Klien <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.client_id}
                onChange={(e) => handleClientChange(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">-- Pilih Klien --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
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
                    {f.name} ({f.license_plate} - {f.seat_capacity} Seat)
                  </option>
                ))}
              </select>
            </div>

            {/* Tanggal Pemakaian */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Pemakaian <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.usage_date}
                onChange={(e) => setFormData({ ...formData, usage_date: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
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
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[11px]">Klien</span>
                <span className="font-bold text-slate-800">{selectedRes.client_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Armada Unit</span>
                <span className="font-bold text-slate-800">{selectedRes.fleet_name} ({selectedRes.license_plate})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Tanggal Pemakaian</span>
                <span className="font-medium text-slate-800">{formatTanggal(selectedRes.usage_date)}</span>
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
        message="Apakah Anda yakin ingin menghapus data reservasi ini? Invoice dan kwitansi terkait juga akan terpengaruh."
      />
    </div>
  );
}
