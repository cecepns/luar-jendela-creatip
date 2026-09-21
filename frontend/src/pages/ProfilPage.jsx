import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  Save,
  Loader2,
  CreditCard,
  UserCheck,
  Globe,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";

export default function ProfilPage() {
  const [profile, setProfile] = useState({
    company_name: "Luar Jendela Creatip",
    tagline: "Transportasi Pariwisata & Travel Service",
    address: "Jl. Kreatif No. 88, Jakarta Selatan",
    phone: "+62 856-9349-9915",
    email: "info@luarjendelacreatip.com",
    website: "https://luarjendelacreatip.com",
    bank_name: "BCA",
    bank_account_no: "8735281920",
    bank_account_holder: "Luar Jendela Creatip",
    signer_name: "Cecep Firdaus",
    signer_title: "Direktur Operasional",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const res = await request.get(API_ENDPOINTS.COMPANY_PROFILE.GET);
        if (res.success && res.data) {
          setProfile(res.data);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await request.put(API_ENDPOINTS.COMPANY_PROFILE.UPDATE, profile);
      if (res.success) {
        toast.success(res.message || "Profil perusahaan berhasil diperbarui!");
      }
    } catch {
      toast.error("Gagal memperbarui profil perusahaan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Profil Usaha & Pengaturan
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Identitas bisnis Luar Jendela Creatip, rekening resmi, dan format tanda tangan dokumen
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
          Memuat profil usaha...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Identitas Usaha */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <img
                src={logoImg}
                alt="Logo"
                className="w-12 h-12 object-contain rounded-xl border border-slate-100 p-1"
              />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Identitas Usaha
                </h3>
                <p className="text-xs text-slate-500">
                  Nama dan logo yang tercetak pada Invoice, Kwitansi, dan PWA
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Bisnis / Perusahaan
                </label>
                <input
                  type="text"
                  value={profile.company_name}
                  onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Slogan / Tagline
                </label>
                <input
                  type="text"
                  value={profile.tagline || ""}
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp Kantor
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Email Usaha
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={profile.email || ""}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Kantor & Pool Armada
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    value={profile.address || ""}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Rekening Bank Pembayaran */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-5 h-5 text-brand-600" />
              <h3 className="text-base font-bold text-slate-900">
                Rekening Bank Pembayaran Resmi
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Bank
                </label>
                <input
                  type="text"
                  placeholder="Contoh: BCA / Mandiri"
                  value={profile.bank_name || ""}
                  onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Rekening
                </label>
                <input
                  type="text"
                  placeholder="8735281920"
                  value={profile.bank_account_no || ""}
                  onChange={(e) => setProfile({ ...profile, bank_account_no: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Atas Nama Rekening
                </label>
                <input
                  type="text"
                  placeholder="Luar Jendela Creatip"
                  value={profile.bank_account_holder || ""}
                  onChange={(e) => setProfile({ ...profile, bank_account_holder: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Pengesahan & Digital Signature */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserCheck className="w-5 h-5 text-brand-600" />
              <h3 className="text-base font-bold text-slate-900">
                Pengesahan Dokumen & Digital QR Signature
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Penandatangan Resmi
                </label>
                <input
                  type="text"
                  placeholder="Cecep Firdaus"
                  value={profile.signer_name || ""}
                  onChange={(e) => setProfile({ ...profile, signer_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jabatan Penandatangan
                </label>
                <input
                  type="text"
                  placeholder="Direktur Operasional"
                  value={profile.signer_title || ""}
                  onChange={(e) => setProfile({ ...profile, signer_title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Pengaturan Profil</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
