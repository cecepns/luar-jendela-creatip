import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { Download, Loader2, ZoomIn, ZoomOut, CheckCircle2, MessageSquare, Send } from "lucide-react";
import Modal from "./Modal";
import logoImg from "@/assets/logo.png";
import signatureImg from "@/assets/signature.png";
import { formatRupiah, formatTanggal } from "@/utils/formatters";
import { exportElementToPdf } from "@/utils/pdfGenerator";

export default function PrintReceiptModal({
  isOpen,
  onClose,
  receipt,
  companyProfile,
}) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [zoomMode, setZoomMode] = useState("fit");
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef(null);
  const printAreaRef = useRef(null);

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

  if (!receipt) return null;

  const CANVAS_WIDTH = 690;
  const CANVAS_HEIGHT = 580;

  const isMobile = containerWidth > 0 && containerWidth < CANVAS_WIDTH + 32;
  const fitScale = isMobile
    ? Math.min(1, Math.max(0.38, (containerWidth - 24) / CANVAS_WIDTH))
    : 1;
  const currentScale = zoomMode === "fit" && isMobile ? fitScale : 1;

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    const toastId = toast.loading("Sedang menyusun file PDF Kuitansi...");

    const previousZoom = zoomMode;
    try {
      // Force 100% full scale DOM before capture so html-to-image never captures a shrunk/zoomed bounding box
      if (zoomMode !== "original") {
        setZoomMode("original");
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const cleanFileName = `Kuitansi_${receipt.receipt_number.replace(/[\/\\]/g, "-")}.pdf`;
      await exportElementToPdf(printAreaRef.current, cleanFileName, {
        orientation: "portrait",
        width: CANVAS_WIDTH,
        height: printAreaRef.current.scrollHeight,
        margin: 5,
        centerVertical: false,
      });
      toast.success("File PDF Kuitansi berhasil diunduh!", { id: toastId });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Gagal membuat file PDF. Silakan coba lagi.", { id: toastId });
    } finally {
      setZoomMode(previousZoom);
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWa = () => {
    const clientName = receipt.client_name || "Pelanggan";
    const receiptNo = receipt.receipt_number;
    const dateStr = formatTanggal(receipt.receipt_date);
    const amountStr = formatRupiah(receipt.amount);
    const forPayment = receipt.payment_for || "Sewa Bus Pariwisata";
    const methodStr = receipt.payment_method || "Transfer Bank / Midtrans";

    const text = `Halo ${clientName},

Berikut bukti pembayaran / Kuitansi resmi dari LUAR JENDELA CREATRIP:

No. Kuitansi: ${receiptNo}
Tanggal: ${dateStr}
Untuk Pembayaran: ${forPayment}
Total Nominal: ${amountStr} (LUNAS)
Metode: ${methodStr}

Terima kasih atas kerjasamanya \u{1F64F}`;

    let phone = receipt.client_phone ? receipt.client_phone.replace(/[^0-9]/g, "") : "";
    if (phone.startsWith("0")) phone = "62" + phone.slice(1);

    handleDownloadPdf();

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kuitansi Resmi Luar Jendela Creatrip" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-xs text-slate-600 font-medium">
            Dokumen Tanda Bukti Pembayaran Sah
          </span>

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

            {/* Kirim ke WA button */}
            <button
              type="button"
              onClick={handleSendWa}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              title="Kirim Kuitansi & Chat ke WhatsApp Klien"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Kirim ke WA</span>
            </button>

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
                  <span>Cetak PDF Kuitansi</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile hint if in 100% mode */}
        {isMobile && zoomMode === "original" && (
          <div className="text-center text-[11px] text-slate-500 bg-amber-50 border border-amber-200 py-1.5 px-3 rounded-lg">
            👉 Geser ke kanan & kiri untuk melihat seluruh dokumen.
          </div>
        )}

        {/* KWITANSI PREVIEW CANVAS */}
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
              {/* ===== HEADER TABLE ===== */}
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

                {/* KUITANSI Green Box */}
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
                    KUITANSI
                  </div>
                </div>
              </div>

              {/* Header Separator Divider Line */}
              <div
                style={{
                  height: "2px",
                  backgroundColor: "#0f172a",
                  marginTop: "12px",
                  marginBottom: "14px",
                }}
              />

              {/* ===== KUITANSI BODY ===== */}
              <div style={{ border: "1px solid #64748b", borderRadius: "2px", overflow: "hidden", marginBottom: "16px" }}>
                {/* Meta Row: No & Tanggal */}
                <div style={{ display: "flex", backgroundColor: "#f8fafc", borderBottom: "1px solid #64748b", padding: "7px 12px", fontSize: "10.5px" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontStyle: "italic", fontWeight: "bold", color: "#475569", marginRight: "6px" }}>NO. KUITANSI:</span>
                    <span style={{ fontWeight: "bold", fontFamily: "monospace", color: "#0f172a" }}>{receipt.receipt_number}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontStyle: "italic", fontWeight: "bold", color: "#475569", marginRight: "6px" }}>TANGGAL:</span>
                    <span style={{ fontWeight: "600", color: "#0f172a" }}>{formatTanggal(receipt.receipt_date)}</span>
                  </div>
                </div>

                {/* Telah Terima Dari */}
                <div style={{ display: "flex", borderBottom: "1px solid #cbd5e1", padding: "9px 12px", alignItems: "flex-start" }}>
                  <div style={{ width: "150px", fontStyle: "italic", fontWeight: "bold", color: "#475569", flexShrink: 0 }}>
                    Telah Terima Dari
                  </div>
                  <div style={{ fontWeight: "800", textTransform: "uppercase", fontSize: "12px", color: "#0f172a" }}>
                    : {receipt.client_name || "-"}
                  </div>
                </div>

                {/* Uang Sejumlah (Say / Terbilang) - Clean Slate design per client request */}
                <div style={{ display: "flex", backgroundColor: "#f8fafc", borderBottom: "1px solid #cbd5e1", padding: "10px 12px", alignItems: "flex-start", color: "#0f172a" }}>
                  <div style={{ width: "150px", fontWeight: "bold", color: "#334155", fontSize: "11px", flexShrink: 0 }}>
                    Uang Sejumlah (Say)
                  </div>
                  <div style={{ fontStyle: "italic", fontWeight: "bold", fontSize: "11.5px", lineHeight: "1.3", color: "#0f172a" }}>
                    : {receipt.spell_out || "-"}
                  </div>
                </div>

                {/* Untuk Pembayaran */}
                <div style={{ display: "flex", borderBottom: "1px solid #cbd5e1", padding: "9px 12px", alignItems: "flex-start" }}>
                  <div style={{ width: "150px", fontStyle: "italic", fontWeight: "bold", color: "#475569", flexShrink: 0 }}>
                    Untuk Pembayaran
                  </div>
                  <div style={{ color: "#0f172a", fontWeight: "600" }}>
                    : {receipt.payment_for || "Sewa Bus Pariwisata"}
                  </div>
                </div>

                {/* Metode Pembayaran */}
                <div style={{ display: "flex", borderBottom: "1px solid #64748b", padding: "8px 12px", backgroundColor: "#ffffff" }}>
                  <div style={{ width: "150px", fontStyle: "italic", fontWeight: "bold", color: "#475569", flexShrink: 0 }}>
                    Metode Pembayaran
                  </div>
                  <div style={{ color: "#334155", fontWeight: "500" }}>
                    : {receipt.payment_method || "Transfer Bank / Midtrans"}
                  </div>
                </div>

                {/* Nominal Jumlah Box */}
                <div style={{ display: "flex", backgroundColor: "#f8fafc", padding: "10px 12px", alignItems: "center", borderTop: "1px solid #cbd5e1" }}>
                  <div style={{ width: "150px", fontWeight: "900", color: "#0f172a", fontSize: "11px", flexShrink: 0 }}>
                    JUMLAH NOMINAL
                  </div>
                  <div>
                    <span
                      style={{
                        backgroundColor: "#0f172a",
                        color: "#ffffff",
                        fontFamily: "monospace",
                        fontWeight: "900",
                        fontSize: "18px",
                        padding: "5px 14px",
                        borderRadius: "3px",
                        letterSpacing: "0.5px",
                        display: "inline-block",
                      }}
                    >
                      {formatRupiah(receipt.amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ===== SIGNER & QR FOOTER ===== */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "16px" }}>
                {/* Left: QR Verification */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {receipt.qr_signature ? (
                    <img
                      src={receipt.qr_signature}
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
                      <span>Kwitansi Sah Terverifikasi</span>
                    </div>
                    <div style={{ marginTop: "2px" }}>Scan QR untuk validasi keabsahan dokumen</div>
                  </div>
                </div>

                {/* Right: Signer */}
                <div style={{ textAlign: "center", width: "160px" }}>
                  <div style={{ fontSize: "9.5px", color: "#334155", marginBottom: "2px" }}>
                    Jakarta, {formatTanggal(receipt.receipt_date)}
                  </div>
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
