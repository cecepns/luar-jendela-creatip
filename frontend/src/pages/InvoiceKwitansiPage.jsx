import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  ReceiptText,
  FileCheck,
  Search,
  CreditCard,
  Printer,
  CheckCircle2,
  Calendar,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Check,
} from "lucide-react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { formatRupiah, formatTanggal, getStatusBadge } from "@/utils/formatters";
import SearchInput from "@/components/SearchInput";
import Pagination from "@/components/Pagination";
import PrintInvoiceModal from "@/components/PrintInvoiceModal";
import PrintReceiptModal from "@/components/PrintReceiptModal";

export default function InvoiceKwitansiPage() {
  const [activeTab, setActiveTab] = useState("invoices"); // "invoices" | "receipts"

  // Invoices State
  const [invoices, setInvoices] = useState([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [totalPagesInv, setTotalPagesInv] = useState(1);
  const [pageInv, setPageInv] = useState(1);
  const [limitInv, setLimitInv] = useState(10);
  const [searchInv, setSearchInv] = useState("");
  const [statusFilterInv, setStatusFilterInv] = useState("");

  // Receipts State
  const [receipts, setReceipts] = useState([]);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [totalPagesRec, setTotalPagesRec] = useState(1);
  const [pageRec, setPageRec] = useState(1);
  const [limitRec, setLimitRec] = useState(10);
  const [searchRec, setSearchRec] = useState("");

  // Company Profile for official printing
  const [companyProfile, setCompanyProfile] = useState(null);

  // Modal Views
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Fetch Company Profile
  useEffect(() => {
    request.get(API_ENDPOINTS.COMPANY_PROFILE.GET)
      .then((res) => {
        if (res.success) setCompanyProfile(res.data);
      })
      .catch((err) => console.error("Profile error:", err));
  }, []);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.INVOICES.LIST, {
        page: pageInv,
        limit: limitInv,
        search: searchInv,
        status: statusFilterInv,
      });
      if (res.success) {
        setInvoices(res.data || []);
        if (res.pagination) {
          setTotalInvoices(res.pagination.total);
          setTotalPagesInv(res.pagination.totalPages);
        }
      }
    } catch {
      toast.error("Gagal memuat data invoice.");
    } finally {
      setIsLoading(false);
    }
  }, [pageInv, limitInv, searchInv, statusFilterInv]);

  // Fetch Receipts
  const fetchReceipts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.RECEIPTS.LIST, {
        page: pageRec,
        limit: limitRec,
        search: searchRec,
      });
      if (res.success) {
        setReceipts(res.data || []);
        if (res.pagination) {
          setTotalReceipts(res.pagination.total);
          setTotalPagesRec(res.pagination.totalPages);
        }
      }
    } catch {
      toast.error("Gagal memuat data kwitansi.");
    } finally {
      setIsLoading(false);
    }
  }, [pageRec, limitRec, searchRec]);

  useEffect(() => {
    if (activeTab === "invoices") {
      fetchInvoices();
    } else {
      fetchReceipts();
    }
  }, [activeTab, fetchInvoices, fetchReceipts]);

  // Handle Midtrans Snap Payment
  const handlePayMidtrans = async (invoice) => {
    setIsProcessingPayment(true);
    try {
      const res = await request.post(API_ENDPOINTS.INVOICES.MIDTRANS_TOKEN(invoice.id));
      if (!res.success || !res.token) {
        toast.error(res.message || "Gagal mendapatkan sesi Midtrans.");
        return;
      }

      if (window.snap) {
        window.snap.pay(res.token, {
          onSuccess: async function (result) {
            toast.success("Pembayaran berhasil via Midtrans!");
            // Mark invoice as paid and generate receipt
            await request.post(API_ENDPOINTS.INVOICES.MARK_PAID(invoice.id), {
              status: "LUNAS",
              paid_amount: invoice.total_amount,
              payment_method: "Midtrans (" + (result.payment_type || "Online") + ")",
            });
            fetchInvoices();
            fetchReceipts();
          },
          onPending: function (result) {
            toast("Menunggu pembayaran Midtrans diselesaikan.", { icon: "⏳" });
            fetchInvoices();
          },
          onError: function (result) {
            toast.error("Pembayaran Midtrans gagal atau dibatalkan.");
          },
          onClose: function () {
            toast("Jendela pembayaran Midtrans ditutup.");
          },
        });
      } else {
        // Fallback if snap script blocked: open redirect url
        if (res.redirect_url) {
          window.open(res.redirect_url, "_blank");
        } else {
          toast.error("SDK Midtrans Snap belum siap. Silakan coba lagi.");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memproses pembayaran Midtrans.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Toggle Mark as Paid manually
  const handleMarkPaid = async (invoice) => {
    try {
      const res = await request.post(API_ENDPOINTS.INVOICES.MARK_PAID(invoice.id), {
        status: "LUNAS",
        paid_amount: invoice.total_amount,
        payment_method: "Transfer Bank BCA",
      });
      if (res.success) {
        toast.success(res.message || "Invoice ditandai LUNAS & Kwitansi otomatis diterbitkan!");
        fetchInvoices();
        fetchReceipts();
      }
    } catch {
      toast.error("Gagal memperbarui status invoice.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Invoice & Kwitansi Resmi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Penerbitan otomatis, pembayaran Midtrans Snap, terbilang rupiah & tanda tangan digital QR
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "invoices"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Daftar Invoice ({totalInvoices})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("receipts")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "receipts"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Daftar Kwitansi Resmi ({totalReceipts})</span>
        </button>
      </div>

      {/* INVOICES TAB CONTENT */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="w-full sm:w-72">
              <SearchInput
                value={searchInv}
                onChange={(val) => {
                  setSearchInv(val);
                  setPageInv(1);
                }}
                placeholder="Cari no. invoice, klien, tujuan..."
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {["", "Belum Lunas", "DP", "LUNAS", "BATAL"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilterInv(st);
                    setPageInv(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilterInv === st
                      ? "bg-brand-600 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {st === "" ? "Semua Status" : st}
                </button>
              ))}
            </div>
          </div>

          {/* Invoice Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">No. Invoice</th>
                    <th className="py-3.5 px-4 font-semibold">Klien & Rute</th>
                    <th className="py-3.5 px-4 font-semibold">Jatuh Tempo</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Total Tagihan</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Sisa Tagihan</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Aksi & Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                        Memuat data invoice...
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Belum ada invoice yang diterbitkan.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => {
                      const badge = getStatusBadge(inv.payment_status);
                      const isPaid = inv.payment_status === "LUNAS";
                      const sisa = Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount || 0));

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                              {inv.invoice_number}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Tgl: {formatTanggal(inv.invoice_date)}
                            </p>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">{inv.client_name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[180px] mt-0.5">
                              {inv.destination || "Tour Pariwisata"}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {formatTanggal(inv.due_date)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(inv.total_amount)}
                            {Number(inv.ppn_percent) > 0 && (
                              <p className="text-[10px] text-slate-400 font-normal">
                                Termasuk PPN {inv.ppn_percent}%
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono">
                            {isPaid ? (
                              <span className="text-xs text-emerald-600 font-semibold">Lunas</span>
                            ) : (
                              <span className="text-xs text-rose-600 font-bold">{formatRupiah(sisa)}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                              {badge.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Midtrans Button */}
                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => handlePayMidtrans(inv)}
                                  disabled={isProcessingPayment}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                                  title="Bayar dengan Midtrans (QRIS/VA)"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Midtrans</span>
                                </button>
                              )}

                              {/* Manual Lunas Toggle */}
                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkPaid(inv)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                  title="Tandai Sudah Lunas"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Lunas</span>
                                </button>
                              )}

                              {/* Print / View */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setIsInvoiceModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                                title="Lihat & Cetak Invoice Resmi"
                              >
                                <Printer className="w-4 h-4" />
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

            {/* Pagination */}
            <Pagination
              currentPage={pageInv}
              totalPages={totalPagesInv}
              totalItems={totalInvoices}
              limit={limitInv}
              onPageChange={setPageInv}
              onLimitChange={(lim) => {
                setLimitInv(lim);
                setPageInv(1);
              }}
            />
          </div>
        </div>
      )}

      {/* RECEIPTS (KWITANSI) TAB CONTENT */}
      {activeTab === "receipts" && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="w-full sm:w-80">
              <SearchInput
                value={searchRec}
                onChange={(val) => {
                  setSearchRec(val);
                  setPageRec(1);
                }}
                placeholder="Cari no. kwitansi, klien, keterangan..."
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">No. Kwitansi</th>
                    <th className="py-3.5 px-4 font-semibold">Diterima Dari</th>
                    <th className="py-3.5 px-4 font-semibold">Tanggal</th>
                    <th className="py-3.5 px-4 font-semibold">Untuk Pembayaran</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Jumlah Uang</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Verifikasi Digital</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Cetak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                        Memuat data kwitansi...
                      </td>
                    </tr>
                  ) : receipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Belum ada kwitansi yang diterbitkan.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 bg-amber-50/50">
                          {rec.receipt_number}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {rec.client_name}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {formatTanggal(rec.receipt_date)}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                          {rec.payment_for}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                          {formatRupiah(rec.amount)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            QR Digital
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReceipt(rec);
                              setIsReceiptModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Cetak Kwitansi Resmi"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={pageRec}
              totalPages={totalPagesRec}
              totalItems={totalReceipts}
              limit={limitRec}
              onPageChange={setPageRec}
              onLimitChange={(lim) => {
                setLimitRec(lim);
                setPageRec(1);
              }}
            />
          </div>
        </div>
      )}

      {/* Print / View Invoice Modal */}
      <PrintInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoice={selectedInvoice}
        companyProfile={companyProfile}
        onPayMidtrans={handlePayMidtrans}
      />

      {/* Print / View Receipt Modal */}
      <PrintReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={selectedReceipt}
        companyProfile={companyProfile}
      />
    </div>
  );
}
