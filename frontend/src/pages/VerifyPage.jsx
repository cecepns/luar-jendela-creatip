import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { formatRupiah, formatTanggal } from "@/utils/formatters";

export default function VerifyPage() {
  const params = useParams();
  const type = params.type;
  const code = params["*"] || params.code;
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyDoc = async () => {
      setLoading(true);
      try {
        const res = await request.get(API_ENDPOINTS.VERIFY.CHECK(type, code));
        if (res.success && res.valid) {
          setResult(res);
        } else {
          setError("Dokumen tidak ditemukan atau data digital signature tidak sah.");
        }
      } catch (err) {
        setError("Dokumen tidak ditemukan atau tanda tangan digital tidak valid.");
      } finally {
        setLoading(false);
      }
    };

    if (type && code) {
      verifyDoc();
    }
  }, [type, code]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
          <img
            src={logoImg}
            alt="Logo"
            className="w-16 h-16 object-contain mb-3 rounded-xl border border-slate-100 p-1"
          />
          <h1 className="text-xl font-black text-slate-900">
            Luar Jendela Creatip
          </h1>
          <p className="text-xs text-slate-500">
            Sistem Verifikasi Dokumen & Tanda Tangan Elektronik
          </p>
        </div>

        {/* Verification Status */}
        <div className="py-6">
          {loading ? (
            <div className="py-8 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Memverifikasi keaslian dokumen...</p>
            </div>
          ) : error ? (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Verifikasi Tidak Valid
              </h2>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full">
                  TERVERIFIKASI RESMI
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-2">
                  Dokumen {result?.type?.toUpperCase()} Sah & Terdaftar
                </h2>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  No: {result?.code}
                </p>
              </div>

              {/* Data Summary */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Penerbit:</span>
                  <span className="font-semibold text-slate-800">{result?.company?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Penandatangan:</span>
                  <span className="font-semibold text-slate-800">{result?.company?.signer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Klien Terkait:</span>
                  <span className="font-semibold text-slate-800">{result?.data?.client_name || "-"}</span>
                </div>
                {result?.data?.total_amount && (
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                    <span className="text-slate-700">Total Nominal:</span>
                    <span className="text-brand-700 font-mono">{formatRupiah(result.data.total_amount)}</span>
                  </div>
                )}
                {result?.data?.amount && (
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                    <span className="text-slate-700">Jumlah Pembayaran:</span>
                    <span className="text-emerald-700 font-mono">{formatRupiah(result.data.amount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Aplikasi
          </Link>
        </div>
      </div>
    </div>
  );
}
