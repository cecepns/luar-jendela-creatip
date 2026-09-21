import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Bus,
  Plus,
  Edit2,
  Trash2,
  Users,
  Tag,
  CheckCircle2,
  Wrench,
  Image as ImageIcon,
  Loader2,
  Upload,
} from "lucide-react";
import { request } from "@/utils/request";
import { API_ENDPOINTS, getUploadUrl } from "@/utils/endpoints";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ArmadaPage() {
  const [fleets, setFleets] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [currentId, setCurrentId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const initialForm = {
    name: "",
    license_plate: "",
    seat_capacity: 31,
    facilities: "AC, Reclining Seat, Audio, USB Charger",
    status: "Tersedia",
    notes: "",
  };
  const [formData, setFormData] = useState(initialForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFleets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit,
        search,
        status: statusFilter,
      };
      const res = await request.get(API_ENDPOINTS.FLEETS.LIST, params);
      if (res.success) {
        setFleets(res.data || []);
        if (res.pagination) {
          setTotalItems(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        }
      }
    } catch {
      toast.error("Gagal memuat data armada.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchFleets();
  }, [fetchFleets]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData(initialForm);
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fleet) => {
    setModalMode("edit");
    setCurrentId(fleet.id);
    setFormData({
      name: fleet.name,
      license_plate: fleet.license_plate,
      seat_capacity: fleet.seat_capacity,
      facilities: fleet.facilities || "",
      status: fleet.status || "Tersedia",
      notes: fleet.notes || "",
    });
    setPhotoFile(null);
    setPhotoPreview(getUploadUrl(fleet.photo_url) || null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran foto maksimal 5MB!");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.license_plate || !formData.seat_capacity) {
      toast.error("Mohon lengkapi Nama Unit, Nopol, dan Jumlah Kursi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("license_plate", formData.license_plate);
      data.append("seat_capacity", formData.seat_capacity);
      data.append("facilities", formData.facilities);
      data.append("status", formData.status);
      data.append("notes", formData.notes);
      if (photoFile) {
        data.append("photo", photoFile);
      }

      if (modalMode === "create") {
        const res = await request.upload(API_ENDPOINTS.FLEETS.CREATE, data);
        if (res.success) {
          toast.success("Armada berhasil ditambahkan!");
          setIsModalOpen(false);
          fetchFleets();
        }
      } else {
        const res = await request.uploadPut(API_ENDPOINTS.FLEETS.UPDATE(currentId), data);
        if (res.success) {
          toast.success("Armada berhasil diperbarui!");
          setIsModalOpen(false);
          fetchFleets();
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menyimpan data armada.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await request.delete(API_ENDPOINTS.FLEETS.DELETE(deleteTargetId));
      if (res.success) {
        toast.success("Armada berhasil dihapus.");
        setIsDeleteDialogOpen(false);
        fetchFleets();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menghapus armada.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const getFleetBadge = (status) => {
    switch (status) {
      case "Tersedia":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Beroperasi":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Perawatan":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Data Armada Bus & Mobil
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manajemen unit armada pariwisata, kapasitas kursi, dan status unit
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Armada
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="w-full sm:w-72">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Cari unit atau plat nomor..."
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["", "Tersedia", "Beroperasi", "Perawatan"].map((st) => (
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
                <th className="py-3.5 px-4 font-semibold">Foto</th>
                <th className="py-3.5 px-4 font-semibold">Nama Unit</th>
                <th className="py-3.5 px-4 font-semibold">Plat Nomor (Nopol)</th>
                <th className="py-3.5 px-4 font-semibold">Kapasitas Kursi</th>
                <th className="py-3.5 px-4 font-semibold">Fasilitas</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                    Memuat data armada...
                  </td>
                </tr>
              ) : fleets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Belum ada data armada unit.
                  </td>
                </tr>
              ) : (
                fleets.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      {f.photo_url ? (
                        <img
                          src={getUploadUrl(f.photo_url)}
                          alt={f.name}
                          className="w-12 h-10 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                          <Bus className="w-5 h-5" />
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{f.name}</p>
                      {f.notes && <p className="text-[11px] text-slate-400 mt-0.5">{f.notes}</p>}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs">
                        {f.license_plate}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {f.seat_capacity} Seat
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {f.facilities || "-"}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getFleetBadge(f.status)}`}>
                        {f.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(f)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Armada"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTargetId(f.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Armada"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Modal Create / Edit Armada */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === "create" ? "Tambah Armada Baru" : "Edit Armada"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Unit Armada <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Medium Bus Executive Suite"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Plat Nomor (Nopol) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="B 7123 LJ"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jumlah Kursi <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={formData.seat_capacity}
                onChange={(e) => setFormData({ ...formData, seat_capacity: parseInt(e.target.value) || 0 })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Armada
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="Tersedia">Tersedia</option>
              <option value="Beroperasi">Beroperasi</option>
              <option value="Perawatan">Perawatan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fasilitas Unit
            </label>
            <input
              type="text"
              placeholder="AC, Reclining Seat, Audio Karaoke, USB Charger..."
              value={formData.facilities}
              onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Foto Unit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Foto Unit Armada (Opsional)
            </label>
            <div className="flex items-center gap-3">
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-16 h-14 object-cover rounded-xl border border-slate-200"
                />
              )}
              <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl text-xs text-slate-600 hover:text-brand-600 transition-colors">
                <Upload className="w-4 h-4" />
                <span>{photoFile ? photoFile.name : "Pilih File Foto (JPG/PNG)"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan / Riwayat
            </label>
            <textarea
              rows={2}
              placeholder="Catatan kondisi unit atau servis..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

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
              {modalMode === "create" ? "Simpan Armada" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Hapus Data Armada"
        message="Apakah Anda yakin ingin menghapus data armada ini? Pastikan armada tidak sedang aktif dalam reservasi."
      />
    </div>
  );
}
