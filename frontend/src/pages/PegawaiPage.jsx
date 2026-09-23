import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Shield,
  ShieldCheck,
  Briefcase,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  UserCheck,
  MessageCircle,
} from "lucide-react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrator", desc: "Akses penuh ke seluruh modul sistem" },
  { value: "staff", label: "Staff Operasional", desc: "Kelola reservasi, armada, dan invoice" },
  { value: "kasir", label: "Kasir / Keuangan", desc: "Fokus kelola invoice dan kwitansi" },
  { value: "driver", label: "Driver / Kru Armada", desc: "Kru perjalanan dan armada bus" },
];

export default function PegawaiPage() {
  const [users, setUsers] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Current logged in user from localStorage
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("ljc_user") || "null");
    } catch {
      return null;
    }
  })();

  // Modal Create & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [currentId, setCurrentId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const initialForm = {
    name: "",
    username: "",
    email: "",
    phone: "",
    role: "staff",
    status: "aktif",
    password: "",
  };
  const [formData, setFormData] = useState(initialForm);

  // Confirm Delete
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Pegawai List
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.USERS.LIST, {
        page,
        limit,
        search,
        role: roleFilter,
        status: statusFilter,
      });

      if (res.success) {
        setUsers(res.data || []);
        if (res.pagination) {
          setTotalItems(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        }
      } else {
        toast.error(res.message || "Gagal memuat data pegawai.");
      }
    } catch (err) {
      toast.error("Gagal memuat data pegawai dari server.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when filter changes
  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleFilterChange = (e) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode("create");
    setCurrentId(null);
    setFormData(initialForm);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user) => {
    setModalMode("edit");
    setCurrentId(user.id);
    setFormData({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "staff",
      status: user.status || "aktif",
      password: "", // blank password means keep unchanged
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Submit Create / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.username.trim() || !formData.email.trim()) {
      toast.error("Nama lengkap, username, dan email wajib diisi!");
      return;
    }

    if (modalMode === "create") {
      if (!formData.password || formData.password.length < 6) {
        toast.error("Kata sandi wajib diisi minimal 6 karakter!");
        return;
      }
    } else if (modalMode === "edit" && formData.password && formData.password.length < 6) {
      toast.error("Jika ingin mengubah kata sandi, minimal 6 karakter!");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        const res = await request.post(API_ENDPOINTS.USERS.CREATE, formData);
        if (res.success) {
          toast.success("Pegawai baru berhasil ditambahkan!");
          setIsModalOpen(false);
          fetchUsers();
        } else {
          toast.error(res.message || "Gagal menambahkan pegawai.");
        }
      } else {
        const res = await request.put(API_ENDPOINTS.USERS.UPDATE(currentId), formData);
        if (res.success) {
          toast.success("Data pegawai berhasil diperbarui!");
          setIsModalOpen(false);
          fetchUsers();
        } else {
          toast.error(res.message || "Gagal memperbarui pegawai.");
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Terjadi kesalahan saat menyimpan data pegawai.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Confirm
  const handleOpenDelete = (user) => {
    if (currentUser && currentUser.id === user.id) {
      toast.error("Anda tidak dapat menghapus akun Anda sendiri!");
      return;
    }
    setDeleteTarget(user);
    setIsDeleteDialogOpen(true);
  };

  // Execute Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await request.delete(API_ENDPOINTS.USERS.DELETE(deleteTarget.id));
      if (res.success) {
        toast.success(res.message || "Pegawai berhasil dihapus.");
        setIsDeleteDialogOpen(false);
        setDeleteTarget(null);
        fetchUsers();
      } else {
        toast.error(res.message || "Gagal menghapus pegawai.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menghapus data pegawai.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics helper
  const totalPegawai = totalItems;
  const countAktif = users.filter((u) => u.status === "aktif").length;
  const countAdmin = users.filter((u) => u.role === "admin").length;
  const countStaff = users.filter((u) => u.role !== "admin").length;

  // Helper badge role
  const renderRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            <Shield className="w-3 h-3" />
            Administrator
          </span>
        );
      case "kasir":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
            <Briefcase className="w-3 h-3" />
            Kasir / Keuangan
          </span>
        );
      case "driver":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <UserCheck className="w-3 h-3" />
            Driver / Kru
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
            <Users className="w-3 h-3" />
            Staff Operasional
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
              <UserCheck className="w-6 h-6" />
            </div>
            <span>Manajemen Pegawai</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola akun pengguna, hak akses, dan tim operasional yang dapat login ke aplikasi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all group"
        >
          <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span>Tambah Pegawai</span>
        </button>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600 flex-shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Akun</p>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-800">{totalPegawai}</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Pegawai Aktif</p>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-800">{countAktif}</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 flex-shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Administrator</p>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-800">{countAdmin}</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 flex-shrink-0">
            <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Staff & Kru</p>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-800">{countStaff}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box with Realtime Debounce */}
          <div className="w-full md:max-w-md">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Cari nama, username, email, atau no. HP..."
              debounceTime={350}
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-medium text-slate-500 hidden sm:inline">Role:</span>
              <select
                value={roleFilter}
                onChange={handleRoleFilterChange}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-xs"
              >
                <option value="all">Semua Role</option>
                <option value="admin">Administrator</option>
                <option value="staff">Staff Operasional</option>
                <option value="kasir">Kasir / Keuangan</option>
                <option value="driver">Driver / Kru</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-medium text-slate-500 hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-xs"
              >
                <option value="all">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table & Mobile Card View Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-3" />
            <p className="text-xs font-medium">Memuat data pegawai...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
              <UserCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {search || roleFilter !== "all" || statusFilter !== "all"
                ? "Tidak ada pegawai yang cocok"
                : "Belum ada data pegawai"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || roleFilter !== "all" || statusFilter !== "all"
                ? "Coba ubah kata kunci pencarian atau reset filter yang dipilih."
                : "Silakan klik tombol 'Tambah Pegawai' untuk menambahkan akun pegawai baru."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">Pegawai</th>
                    <th className="py-3.5 px-4">Username & Email</th>
                    <th className="py-3.5 px-4">Kontak</th>
                    <th className="py-3.5 px-4">Role / Jabatan</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {users.map((user, idx) => {
                    const isSelf = currentUser && currentUser.id === user.id;
                    const avatarLetter = (user.name || "U").charAt(0).toUpperCase();

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-sky-50/30 transition-colors group"
                      >
                        {/* No */}
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">
                          {(page - 1) * limit + idx + 1}
                        </td>

                        {/* Nama & Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0">
                              {avatarLetter}
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-slate-800 group-hover:text-sky-700 transition-colors flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-medium bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-md">
                                    Anda
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                ID: #{user.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Username & Email */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-700 font-mono text-xs">
                              @{user.username}
                            </p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{user.email}</span>
                            </p>
                          </div>
                        </td>

                        {/* Kontak Phone */}
                        <td className="py-3.5 px-4">
                          {user.phone ? (
                            <a
                              href={`https://wa.me/${user.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-emerald-600 transition-colors font-mono"
                              title="Hubungi via WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{user.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic text-xs">-</span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {renderRoleBadge(user.role)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {user.status === "aktif" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="w-3 h-3 text-slate-400" />
                              Nonaktif
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(user)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                              title="Edit Data Pegawai"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(user)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSelf
                                  ? "text-slate-300 cursor-not-allowed"
                                  : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                              }`}
                              title={isSelf ? "Tidak dapat menghapus akun sendiri" : "Hapus Pegawai"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive Card View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {users.map((user) => {
                const isSelf = currentUser && currentUser.id === user.id;
                const avatarLetter = (user.name || "U").charAt(0).toUpperCase();

                return (
                  <div key={user.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0">
                          {avatarLetter}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isSelf && (
                              <span className="text-[10px] font-medium bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-md">
                                Anda
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        {user.status === "aktif" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Nonaktif
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-medium">Role</span>
                        <div className="mt-0.5">{renderRoleBadge(user.role)}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-medium">Kontak</span>
                        {user.phone ? (
                          <a
                            href={`https://wa.me/${user.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-600 font-mono text-xs mt-0.5"
                          >
                            <Phone className="w-3 h-3 text-emerald-500" />
                            <span>{user.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic">-</span>
                        )}
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/50">
                        <span className="text-slate-400 block text-[10px] font-medium">Email</span>
                        <p className="text-slate-700 text-xs truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(user)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-600 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(user)}
                        disabled={isSelf}
                        className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          isSelf
                            ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                            : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Component */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      {/* Modal Form Tambah / Edit Pegawai */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={modalMode === "create" ? "Tambah Pegawai Baru" : "Edit Data Pegawai"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap Pegawai <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Budi Santoso"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Username & Email Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username Login <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    username: e.target.value.toLowerCase().replace(/\s+/g, ""),
                  })
                }
                placeholder="budi_ops"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-mono placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Aktif <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="budi@luarjendelacreatip.com"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* No. Telepon / WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor WhatsApp / HP
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="081234567890"
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 placeholder:text-slate-400 font-mono"
              />
            </div>
          </div>

          {/* Role & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role / Hak Akses <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 cursor-pointer"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Akun <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 cursor-pointer"
              >
                <option value="aktif">Aktif (Dapat Login)</option>
                <option value="nonaktif">Nonaktif (Dilarang Login)</option>
              </select>
            </div>
          </div>

          {/* Kata Sandi */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kata Sandi Login{" "}
              {modalMode === "create" ? (
                <span className="text-rose-500">* (Min. 6 Karakter)</span>
              ) : (
                <span className="text-slate-400 font-normal">
                  (Kosongkan jika tidak ingin mengubah kata sandi)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={modalMode === "create" ? "Minimal 6 karakter" : "••••••••"}
                required={modalMode === "create"}
                className="w-full pr-10 pl-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{modalMode === "create" ? "Simpan Pegawai" : "Perbarui Pegawai"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => !isDeleting && setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Akun Pegawai"
        message={`Apakah Anda yakin ingin menghapus akun pegawai "${deleteTarget?.name}" (@${deleteTarget?.username})? Pegawai ini tidak akan bisa login lagi ke aplikasi.`}
        confirmLabel="Ya, Hapus Akun"
        cancelLabel="Batal"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
