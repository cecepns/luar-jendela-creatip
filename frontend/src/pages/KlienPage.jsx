import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function KlienPage() {
  const [clients, setClients] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Modal Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [currentId, setCurrentId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialForm = {
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  };
  const [formData, setFormData] = useState(initialForm);

  // Delete
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.CLIENTS.LIST, {
        page,
        limit,
        search,
      });
      if (res.success) {
        setClients(res.data || []);
        if (res.pagination) {
          setTotalItems(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        }
      }
    } catch {
      toast.error("Gagal memuat data klien.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client) => {
    setModalMode("edit");
    setCurrentId(client.id);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || "",
      address: client.address || "",
      notes: client.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error("Nama dan Nomor HP klien wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        const res = await request.post(API_ENDPOINTS.CLIENTS.CREATE, formData);
        if (res.success) {
          toast.success("Klien baru berhasil ditambahkan!");
          setIsModalOpen(false);
          fetchClients();
        }
      } else {
        const res = await request.put(API_ENDPOINTS.CLIENTS.UPDATE(currentId), formData);
        if (res.success) {
          toast.success("Data klien berhasil diperbarui!");
          setIsModalOpen(false);
          fetchClients();
        }
      }
    } catch (err) {
      toast.error("Gagal menyimpan data klien.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await request.delete(API_ENDPOINTS.CLIENTS.DELETE(deleteTargetId));
      if (res.success) {
        toast.success("Klien berhasil dihapus.");
        setIsDeleteDialogOpen(false);
        fetchClients();
      }
    } catch (err) {
      toast.error("Gagal menghapus klien. Klien mungkin memiliki riwayat reservasi.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Data Klien
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar pelanggan, kontak WhatsApp, dan riwayat kontak wisata
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Klien
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Cari nama klien, no hp, atau email..."
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Nama Klien</th>
                <th className="py-3.5 px-4 font-semibold">Kontak & WhatsApp</th>
                <th className="py-3.5 px-4 font-semibold">Email</th>
                <th className="py-3.5 px-4 font-semibold">Alamat</th>
                <th className="py-3.5 px-4 font-semibold">Catatan</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                    Memuat data klien...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Belum ada data klien yang terdaftar.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {c.name}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-800">{c.phone}</span>
                        <a
                          href={`https://wa.me/${c.phone?.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Chat via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {c.email || "-"}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {c.address || "-"}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {c.notes || "-"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Klien"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTargetId(c.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Klien"
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

      {/* Modal Create / Edit Klien */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === "create" ? "Tambah Klien Baru" : "Edit Klien"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Klien / Instansi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: PT Sinergi Mandiri Abadi"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor Handphone / WhatsApp <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="08123456789"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email (Opsional)
            </label>
            <input
              type="email"
              placeholder="nama@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat
            </label>
            <textarea
              rows={2}
              placeholder="Alamat kantor atau domisili klien..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan
            </label>
            <input
              type="text"
              placeholder="Catatan preferensi klien..."
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
              {modalMode === "create" ? "Simpan Klien" : "Simpan Perubahan"}
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
        title="Hapus Klien"
        message="Apakah Anda yakin ingin menghapus data klien ini? Data reservasi terkait mungkin terpengaruh."
      />
    </div>
  );
}
