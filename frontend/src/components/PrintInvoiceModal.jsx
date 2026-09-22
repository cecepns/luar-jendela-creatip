import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { Download, CreditCard, Loader2, ZoomIn, ZoomOut, CheckCircle2, MessageSquare, Send, Copy, ExternalLink, X } from "lucide-react";
import Modal from "./Modal";
import logoImg from "@/assets/logo.png";
import signatureImg from "@/assets/signature.png";
import { formatRupiah, formatTanggal, terbilang } from "@/utils/formatters";
import { exportElementToPdf } from "@/utils/pdfGenerator";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";

export default function PrintInvoiceModal({
  isOpen,
  onClose,
  invoice,
  companyProfile,
  onPayMidtrans,
}) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [zoomMode, setZoomMode] = useState("fit"); // "fit" or "original"
  const [containerWidth, setContainerWidth] = useState(0);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waMode, setWaMode] = useState("transfer"); // "transfer" | "midtrans"
  const [isFetchingMidtransLink, setIsFetchingMidtransLink] = useState(false);

  const containerRef = useRef(null);
  const printAreaRef = useRef(null);

  // Monitor container width for responsive scaling on mobile
  useEffect(() => {
    if (!isOpen) return;

    const measureWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    measureWidth();
    const timer = setTimeout(measureWidth, 100);
    window.addEventListener("resize", measureWidth);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measureWidth);
    };
  }, [isOpen]);

  if (!invoice) return null;

  const isPaid = invoice.payment_status === "LUNAS";
  const subtotal = Number(invoice.subtotal) || 0;
  const paidAmount = Number(invoice.paid_amount) || 0;
  const totalAmount = Number(invoice.total_amount) || subtotal;
  const sisa = Math.max(0, totalAmount - paidAmount);

  const terbilangText = terbilang(paidAmount > 0 && !isPaid ? paidAmount : totalAmount);
  const dpPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  // Invoice canvas dimensions
  const CANVAS_WIDTH = 690;
  const CANVAS_HEIGHT = 980;

  // Calculate scale factor for mobile preview
  const isMobile = containerWidth > 0 && containerWidth < CANVAS_WIDTH + 32;
  const fitScale = isMobile
    ? Math.min(1, Math.max(0.38, (containerWidth - 24) / CANVAS_WIDTH))
    : 1;
  const currentScale = zoomMode === "fit" && isMobile ? fitScale : 1;

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    const toastId = toast.loading("Sedang menyusun file PDF Invoice...");

    const previousZoom = zoomMode;
    try {
      // Force 100% full scale DOM before capture so html-to-image never captures a shrunk/zoomed bounding box
      if (zoomMode !== "original") {
        setZoomMode("original");
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const cleanFileName = `Invoice_${invoice.invoice_number.replace(/[\/\\]/g, "-")}.pdf`;
      await exportElementToPdf(printAreaRef.current, cleanFileName, {
        orientation: "portrait",
        width: CANVAS_WIDTH,
        height: printAreaRef.current.scrollHeight,
        margin: 5,
        centerVertical: false,
      });
      toast.success("File PDF Invoice berhasil diunduh!", { id: toastId });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Gagal membuat file PDF. Silakan coba lagi.", { id: toastId });
    } finally {
      setZoomMode(previousZoom);
      setIsGeneratingPdf(false);
    }
  };

  // Clean WhatsApp Phone helper
  const cleanPhone = (phone) => {
    if (!phone) return "";
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
    return clean;
  };

  // Build WhatsApp text according to client requested exact format
  const generateWaMessage = (mode, midtransUrl = "") => {
    const clientName = invoice.client_name || "Pelanggan";
    const invNo = invoice.invoice_number;
    const invDate = formatTanggal(invoice.invoice_date);
    const dueDate = formatTanggal(invoice.due_date);
    const totalRp = formatRupiah(totalAmount);

    if (mode === "midtrans") {
      const snapUrl = midtransUrl || invoice.snap_redirect_url || (invoice.snap_token ? `https://app.midtrans.com/snap/v4/redirection/${invoice.snap_token}` : "");
      return `Halo ${clientName},

Berikut invoice dari LUAR JENDELA CREATRIP:

No. Invoice: ${invNo}
Tanggal: ${invDate}
Jatuh Tempo: ${dueDate}
Total: ${totalRp}

Bayar online (QRIS / VA / e-wallet):
${snapUrl || "Hubungi admin untuk link pembayaran"}

Mohon konfirmasi setelah pembayaran.
Terima kasih atas kerjasamanya 🙏`;
    }

    // Default: Transfer Bank BCA template
    return `Halo ${clientName},

Berikut invoice dari LUAR JENDELA CREATRIP:

No. Invoice: ${invNo}
Tanggal: ${invDate}
Jatuh Tempo: ${dueDate}
Total: ${totalRp}

Pembayaran dapat ditransfer ke:
Rekening pembayaran sewa kendaraan :
- BCA 1663308151 a.n PT. LUAR JENDELA CREATRIP, Atau
- BCA 6280564492 a.n SULTON AZIZ

Mohon konfirmasi setelah pembayaran. Terima kasih atas kerjasamanya 🙏`;
  };

  const handleSendWa = async (mode) => {
    let midtransLink = invoice.snap_redirect_url || (invoice.snap_token ? `https://app.midtrans.com/snap/v4/redirection/${invoice.snap_token}` : "");

    if (mode === "midtrans" && !midtransLink) {
      setIsFetchingMidtransLink(true);
      try {
        const res = await request.post(API_ENDPOINTS.INVOICES.MIDTRANS_TOKEN(invoice.id));
        if (res.success && (res.redirect_url || res.token)) {
          midtransLink = res.redirect_url || `https://app.midtrans.com/snap/v4/redirection/${res.token}`;
        }
      } catch (err) {
        console.error("Fetch midtrans link err:", err);
      } finally {
        setIsFetchingMidtransLink(false);
      }
    }

    const message = generateWaMessage(mode, midtransLink);
    const phone = cleanPhone(invoice.client_phone);

    // Auto trigger PDF download so client has the file ready to attach
    handleDownloadPdf();

    // Open WhatsApp
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
    setIsWaModalOpen(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Resmi Luar Jendela Creatrip" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[11px] ${
                isPaid
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              {invoice.payment_status}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Zoom Toggle on Mobile */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setZoomMode((prev) => (prev === "fit" ? "original" : "fit"))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
                title={zoomMode === "fit" ? "Perbesar ke 100%" : "Pas ke ukuran layar"}
              >
                {zoomMode === "fit" ? (
                  <>
                    <ZoomIn className="w-3.5 h-3.5 text-brand-600" />
                    <span>Zoom 100%</span>
                  </>
                ) : (
                  <>
                    <ZoomOut className="w-3.5 h-3.5 text-brand-600" />
                    <span>Pas Layar</span>
                  </>
                )}
              </button>
            )}

            {/* Kirim ke WhatsApp Button */}
            <button
              type="button"
              onClick={() => setIsWaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              title="Kirim Invoice & Chat ke WhatsApp Klien"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Kirim ke WA</span>
            </button>

            {!isPaid && onPayMidtrans && (
              <button
                type="button"
                onClick={() => onPayMidtrans(invoice)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                <span>Bayar Midtrans</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyusun PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Cetak PDF Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* WhatsApp Share Options Modal */}
        {isWaModalOpen && (
          <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl space-y-3 transition-all animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-emerald-900">Pilih Template Chat WhatsApp untuk Klien</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsWaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-emerald-800">
              Kirim langsung ke nomor WhatsApp <strong>{invoice.client_phone || "(belum ada nomor terdaftar)"}</strong>. File PDF invoice otomatis diunduh untuk dilampirkan.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleSendWa("transfer")}
                className="flex flex-col items-start p-3 bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl text-left shadow-xs transition-all group"
              >
                <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  Opsi 1: Rekening Transfer Bank
                </span>
                <span className="text-[10px] text-slate-500 mt-1">
                  Format chat transfer bank BCA a.n PT. LUAR JENDELA CREATRIP & SULTON AZIZ.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSendWa("midtrans")}
                disabled={isFetchingMidtransLink}
                className="flex flex-col items-start p-3 bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl text-left shadow-xs transition-all group disabled:opacity-50"
              >
                <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                  Opsi 2: Bayar Online Midtrans Link
                </span>
                <span className="text-[10px] text-slate-500 mt-1">
                  {isFetchingMidtransLink ? "Menyiapkan link Midtrans..." : "Format link Snap otomatis agar klien bisa bayar online sendiri (QRIS/VA)."}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile hint if in 100% mode */}
        {isMobile && zoomMode === "original" && (
          <div className="text-center text-[11px] text-slate-500 bg-amber-50 border border-amber-200 py-1.5 px-3 rounded-lg">
            👉 Geser ke kanan & kiri untuk melihat seluruh dokumen.
          </div>
        )}

        {/* INVOICE PREVIEW CONTAINER */}
        <div
          ref={containerRef}
          className={`bg-slate-200/80 p-2 sm:p-4 rounded-xl transition-all ${
            zoomMode === "original" ? "overflow-x-auto" : "overflow-hidden"
          }`}
          style={{ minHeight: isMobile && zoomMode === "fit" ? `${CANVAS_HEIGHT * currentScale + 24}px` : "auto" }}
        >
          <div
            className="flex justify-center"
            style={{
              width: zoomMode === "original" && isMobile ? `${CANVAS_WIDTH}px` : "100%",
              margin: "0 auto",
            }}
          >
            <div
              ref={printAreaRef}
              style={{
                width: `${CANVAS_WIDTH}px`,
                minHeight: `${CANVAS_HEIGHT}px`,
                backgroundColor: "#ffffff",
                padding: "24px 28px",
                boxSizing: "border-box",
                color: "#0f172a",
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: "11px",
                lineHeight: "1.4",
                transform: currentScale !== 1 ? `scale(${currentScale})` : "none",
                transformOrigin: "top center",
                boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.15)",
                borderRadius: "2px",
              }}
            >
              {/* ===== 1. HEADER PERUSAHAAN ===== */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {/* Logo */}
                <div style={{ width: "80px", flexShrink: 0 }}>
                  <img
                    src={logoImg}
                    alt="Logo"
                    style={{
                      width: "75px",
                      height: "auto",
                      maxHeight: "75px",
                      display: "block",
                    }}
                  />
                </div>

                {/* Company Info */}
                <div style={{ flex: 1, textAlign: "center", padding: "0 12px" }}>
                  <div
                    style={{
                      fontSize: "19px",
                      fontWeight: "900",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      color: "#0f172a",
                      lineHeight: "1.2",
                      marginBottom: "6px",
                    }}
                  >
                    {companyProfile?.company_name || "LUAR JENDELA CREATRIP"}
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#334155", fontWeight: "500", lineHeight: "1.35" }}>
                    {companyProfile?.address || "Jalan Puskesmas Setu RT 4/3 No. 34 Setu, Cipayung, Jakarta Timur 13880"}
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#334155", marginTop: "3px" }}>
                    HP. {companyProfile?.phone || "0856 934 999 15"} &nbsp;•&nbsp; Email : {companyProfile?.email || "Luarjendela.cr@gmail.com"}
                  </div>
                </div>

                {/* Green INVOICE Badge */}
                <div style={{ width: "135px", flexShrink: 0, textAlign: "right" }}>
                  <div
                    style={{
                      backgroundColor: "#15803d",
                      color: "#fde047",
                      fontWeight: "900",
                      fontSize: "20px",
                      letterSpacing: "3px",
                      textAlign: "center",
                      padding: "10px 6px",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                    }}
                  >
                    INVOICE
                  </div>
                </div>
              </div>

              {/* Header Separator Divider Line */}
              <div
                style={{
                  height: "2px",
                  backgroundColor: "#0f172a",
                  marginTop: "12px",
                  marginBottom: "12px",
                }}
              />

              {/* ===== 2. BILL TO & INVOICE META ===== */}
              <div
                style={{
                  display: "flex",
                  border: "1px solid #64748b",
                  borderRadius: "2px",
                  marginBottom: "12px",
                  overflow: "hidden",
                }}
              >
                {/* Left: Bill To */}
                <div
                  style={{
                    flex: "1 1 54%",
                    padding: "8px 12px",
                    borderRight: "1px solid #64748b",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <span style={{ fontStyle: "italic", fontWeight: "bold", color: "#475569", width: "65px", flexShrink: 0, fontSize: "11px" }}>
                      BILL TO
                    </span>
                    <span style={{ fontWeight: "800", color: "#0f172a", textTransform: "uppercase", fontSize: "12px" }}>
                      : {invoice.client_name || "-"}
                    </span>
                  </div>
                  {invoice.client_address && (
                    <div style={{ paddingLeft: "71px", fontSize: "9.5px", color: "#475569", marginTop: "2px" }}>
                      {invoice.client_address}
                    </div>
                  )}
                  {invoice.client_phone && (
                    <div style={{ paddingLeft: "71px", fontSize: "9.5px", color: "#475569", marginTop: "2px" }}>
                      Telp: {invoice.client_phone}
                    </div>
                  )}
                </div>

                {/* Right: Meta (Invoice No, Date, Due Date) */}
                <div
                  style={{
                    flex: "1 1 46%",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    fontSize: "10.5px",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                    <tbody>
                      <tr>
                        <td style={{ fontStyle: "italic", fontWeight: "bold", color: "#475569", width: "80px", padding: "2px 0" }}>
                          INVOICE NO.
                        </td>
                        <td style={{ width: "12px", textAlign: "center", fontWeight: "bold", color: "#475569" }}>:</td>
                        <td style={{ fontWeight: "bold", fontFamily: "monospace", color: "#0f172a", textAlign: "left" }}>
                          {invoice.invoice_number}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontStyle: "italic", fontWeight: "bold", color: "#475569", padding: "2px 0" }}>
                          DATE
                        </td>
                        <td style={{ width: "12px", textAlign: "center", fontWeight: "bold", color: "#475569" }}>:</td>
                        <td style={{ color: "#0f172a", textAlign: "left" }}>
                          {formatTanggal(invoice.invoice_date)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontStyle: "italic", fontWeight: "bold", color: "#475569", padding: "2px 0" }}>
                          DUE DATE
                        </td>
                        <td style={{ width: "12px", textAlign: "center", fontWeight: "bold", color: "#475569" }}>:</td>
                        <td style={{ color: "#0f172a", fontWeight: "700", textAlign: "left" }}>
                          {formatTanggal(invoice.due_date)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ===== 3. ITEMS TABLE ===== */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid #64748b",
                  marginBottom: "0px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#15803d", color: "#ffffff", fontSize: "10.5px", fontWeight: "bold" }}>
                    <th style={{ width: "6%", padding: "7px 4px", textAlign: "center", borderRight: "1px solid #166534" }}>
                      NO.
                    </th>
                    <th style={{ width: "50%", padding: "7px 10px", textAlign: "left", borderRight: "1px solid #166534" }}>
                      DESKRIPSI
                    </th>
                    <th style={{ width: "8%", padding: "7px 4px", textAlign: "center", borderRight: "1px solid #166534" }}>
                      QTY
                    </th>
                    <th style={{ width: "18%", padding: "7px 8px", textAlign: "right", borderRight: "1px solid #166534" }}>
                      HARGA SATUAN
                    </th>
                    <th style={{ width: "18%", padding: "7px 8px", textAlign: "right" }}>
                      JUMLAH
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ minHeight: "70px", verticalAlign: "top", fontSize: "11px", backgroundColor: "#ffffff" }}>
                    <td style={{ textAlign: "center", padding: "10px 4px", borderRight: "1px solid #64748b", borderBottom: "1px solid #64748b" }}>
                      1.
                    </td>
                    <td style={{ padding: "10px 10px", borderRight: "1px solid #64748b", borderBottom: "1px solid #64748b" }}>
                      <div style={{ fontWeight: "bold", color: "#0f172a", fontSize: "11.5px" }}>
                        Sewa {invoice.fleet_name || "Armada Bus Pariwisata"}
                      </div>
                      <div style={{ fontSize: "9.5px", color: "#475569", marginTop: "3px" }}>
                        Rute / Tujuan: <strong>{invoice.destination || "-"}</strong>
                      </div>
                      <div style={{ fontSize: "9.5px", color: "#475569" }}>
                        Jadwal: {formatTanggal(invoice.usage_date || invoice.due_date)} {invoice.end_date ? `s/d ${formatTanggal(invoice.end_date)}` : ""}
                      </div>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px 4px", borderRight: "1px solid #64748b", borderBottom: "1px solid #64748b", fontWeight: "600" }}>
                      1
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 8px", fontFamily: "monospace", borderRight: "1px solid #64748b", borderBottom: "1px solid #64748b", color: "#0f172a" }}>
                      {formatRupiah(subtotal)}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 8px", fontFamily: "monospace", fontWeight: "bold", borderBottom: "1px solid #64748b", color: "#0f172a" }}>
                      {formatRupiah(subtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* ===== 4. TOTALS & SAY ROW (Yellow Box) ===== */}
              <div
                style={{
                  display: "flex",
                  backgroundColor: "#f59e0b",
                  border: "1px solid #d97706",
                  borderTop: "none",
                  color: "#0f172a",
                  marginBottom: "12px",
                  boxSizing: "border-box",
                }}
              >
                {/* Left: Terbilang (Say) */}
                <div
                  style={{
                    flex: "1 1 64%",
                    padding: "10px 12px",
                    borderRight: "1px solid #d97706",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: "900", fontSize: "11px", marginRight: "6px" }}>Say :</span>
                    <span style={{ fontStyle: "italic", fontWeight: "bold", fontSize: "11px", lineHeight: "1.3" }}>
                      {terbilangText}
                    </span>
                  </div>
                </div>

                {/* Right: Calculations (Total, DP, Sisa) */}
                <div style={{ flex: "1 1 36%", padding: "8px 12px", fontSize: "10.5px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                    <span style={{ fontStyle: "italic", fontWeight: "bold" }}>Total Harga</span>
                    <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{formatRupiah(totalAmount)}</span>
                  </div>
                  {paidAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                      <span style={{ fontStyle: "italic", fontWeight: "bold" }}>Down Payment {dpPercent}%</span>
                      <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{formatRupiah(paidAmount)}</span>
                    </div>
                  )}
                  {sisa > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid #b45309",
                        paddingTop: "4px",
                        marginTop: "3px",
                        color: "#78350f",
                      }}
                    >
                      <span style={{ fontStyle: "italic", fontWeight: "bold" }}>Sisa Pelunasan</span>
                      <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{formatRupiah(sisa)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ===== 5. INFORMASI PEMBAYARAN ===== */}
              <div
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "2px",
                  padding: "7px 12px",
                  backgroundColor: "#f8fafc",
                  fontSize: "9.5px",
                  marginBottom: "10px",
                }}
              >
                <div style={{ fontWeight: "bold", color: "#0f172a", marginBottom: "4px", fontSize: "10px" }}>
                  Informasi Pembayaran :
                </div>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "120px", color: "#475569", padding: "1px 0" }}>Nama Penerima</td>
                      <td style={{ fontWeight: "bold", color: "#0f172a" }}>: {companyProfile?.bank_account_holder || "LUAR JENDELA CREATRIP"}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "#475569", padding: "1px 0" }}>Bank</td>
                      <td style={{ fontWeight: "bold", color: "#0f172a" }}>: {companyProfile?.bank_name || "Bank Central Asia (BCA)"}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "#475569", padding: "1px 0" }}>Nomor Rekening</td>
                      <td style={{ fontWeight: "bold", fontFamily: "monospace", color: "#0f172a" }}>: {companyProfile?.bank_account_no || "166 330 8151"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ===== 6. SYARAT & KETENTUAN (15 Points) ===== */}
              <div
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "2px",
                  padding: "7px 12px",
                  fontSize: "8.5px",
                  lineHeight: "1.35",
                  marginBottom: "12px",
                }}
              >
                <div style={{ fontWeight: "bold", color: "#0f172a", marginBottom: "4px" }}>
                  Syarat & Ketentuan :
                </div>
                <table style={{ borderCollapse: "collapse", width: "100%", color: "#334155" }}>
                  <tbody>
                    <tr><td style={{ width: "18px", verticalAlign: "top" }}>1.</td><td>Harga SUDAH TERMASUK biaya bahan bakar dan jasa supir</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>2.</td><td>Harga BELUM TERMASUK biaya tol, parkir, makan crew, retribusi jalan, akomodasi/penginapan kru bus (bila menginap), TIP pengemudi</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>3.</td><td>Pemesanan baru DIANGGAP SAH apabila sudah melakukan pembayaran uang muka, pembayaran uang muka minimum 50% dari total</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>4.</td><td>Pembayaran sewa harus lunas 3 hari sebelum keberangkatan</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>5.</td><td>Uang sewa / DP tidak dapat dikembalikan apabila terjadi pembatalan (hangus)</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>6.</td><td>Pembatalan 3 hari sebelum keberangkatan dikenakan cancelation fee 100% dari harga</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>7.</td><td>Kehilangan barang / tertukar di dalam bus bukan tanggung jawab pengelola bus dan kru</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>8.</td><td>Pengemudi berhak menolak jalan yang tidak memadai / dilarang petugas / membahayakan</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>9.</td><td>Perhitungan penggunaan bus 1 hari = Pukul 05.00 s/d Pukul 23.00</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>10.</td><td>Batas Pemakaian Bus (Dalam Kota) maksimum 12 Jam terhitung mulai dari jam penjemputan</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>11.</td><td>Batas Pemakaian Bus (Luar Kota) paling pagi pukul 05.00 sampai maksimum pukul 23.00</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>12.</td><td>Pemakaian melebihi 12 Jam (Dalam Kota) dan atau Melebihi pukul 23.00 (Luar Kota) dikenakan overtime charge</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>13.</td><td>Penyewa harus bertanggung jawab apabila merusak kendaraan / bus</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>14.</td><td>Penjemputan untuk area dalam kota Jakarta GRATIS</td></tr>
                    <tr><td style={{ verticalAlign: "top" }}>15.</td><td>Penjemputan diluar area Jakarta yang tidak searah dikenakan charge sesuai jarak penjemputan.</td></tr>
                  </tbody>
                </table>
              </div>

              {/* ===== 7. SIGNATURE & QR FOOTER ===== */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "14px" }}>
                {/* Left: QR Code Verification */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {invoice.qr_signature ? (
                    <img
                      src={invoice.qr_signature}
                      alt="QR Verification"
                      style={{
                        width: "56px",
                        height: "56px",
                        border: "1px solid #cbd5e1",
                        padding: "2px",
                        backgroundColor: "#ffffff",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        border: "1px dashed #cbd5e1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "8px",
                        color: "#94a3b8",
                      }}
                    >
                      QR Code
                    </div>
                  )}
                  <div style={{ fontSize: "9px", color: "#64748b" }}>
                    <div style={{ color: "#166534", fontWeight: "bold", display: "flex", alignItems: "center", gap: "3px" }}>
                      <CheckCircle2 style={{ width: "12px", height: "12px", display: "inline" }} />
                      <span>Terverifikasi Resmi</span>
                    </div>
                    <div style={{ marginTop: "2px" }}>Scan QR untuk cek keaslian dokumen</div>
                  </div>
                </div>

                {/* Right: Signature & Stamp */}
                <div style={{ textAlign: "center", width: "160px" }}>
                  <div style={{ fontSize: "9.5px", color: "#334155", marginBottom: "4px" }}>
                    Hormat Kami,
                  </div>
                  <div style={{ height: "54px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    {/* Official Stamp */}
                    <img
                      src={logoImg}
                      alt="Stamp"
                      style={{
                        maxWidth: "42px",
                        maxHeight: "42px",
                        width: "auto",
                        height: "auto",
                        opacity: "0.4",
                        position: "absolute",
                        left: "12px",
                      }}
                    />
                    {/* Digital Hand Signature */}
                    <img
                      src={signatureImg}
                      alt="Tanda Tangan Sulton Aziz"
                      style={{
                        height: "52px",
                        width: "auto",
                        objectFit: "contain",
                        zIndex: 1,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: "11px",
                      color: "#0f172a",
                      marginTop: "2px",
                      borderTop: "1px solid #cbd5e1",
                      paddingTop: "2px",
                      display: "inline-block",
                      minWidth: "120px",
                    }}
                  >
                    {companyProfile?.signer_name || "Sulton Aziz"}
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#475569" }}>
                    {companyProfile?.signer_title || "Direktur"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
