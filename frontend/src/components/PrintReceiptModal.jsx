import React, { useState, useRef } from "react";
import html2pdf from "html2pdf.js";
import toast from "react-hot-toast";
import { Download, ShieldCheck, Loader2 } from "lucide-react";
import Modal from "./Modal";
import logoImg from "@/assets/logo.png";
import { formatRupiah, formatTanggal } from "@/utils/formatters";

export default function PrintReceiptModal({
  isOpen,
  onClose,
  receipt,
  companyProfile,
}) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printAreaRef = useRef(null);

  if (!receipt) return null;

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    toast.loading("Sedang membuat file PDF Kwitansi...", { id: "pdf-toast-rec" });

    try {
      const element = printAreaRef.current;
      const cleanFileName = `Kwitansi_${receipt.receipt_number.replace(/[\/\\]/g, "-")}.pdf`;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: cleanFileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 794,
          letterRendering: true,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
      toast.success("File PDF Kwitansi berhasil diunduh!", { id: "pdf-toast-rec" });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Gagal membuat file PDF. Silakan coba lagi.", { id: "pdf-toast-rec" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kwitansi Resmi Luar Jendela Creatrip" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Action Controls */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-xs text-slate-600 font-medium">
            Dokumen Tanda Bukti Pembayaran Sah
          </span>

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
                <span>Cetak PDF Kwitansi</span>
              </>
            )}
          </button>
        </div>

        {/* KWITANSI CANVAS */}
        <div className="overflow-x-auto bg-slate-100 p-2 sm:p-4 rounded-xl flex justify-center">
          <div
            ref={printAreaRef}
            style={{
              width: "690px",
              minHeight: "560px",
              backgroundColor: "#ffffff",
              padding: "24px",
              boxSizing: "border-box",
              color: "#000000",
              fontFamily: "Inter, system-ui, -apple-system, sans-serif",
              fontSize: "11px",
              lineHeight: "1.35",
            }}
          >
            {/* ===== HEADER TABLE ===== */}
            <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "2px solid #000000", paddingBottom: "8px", marginBottom: "12px" }}>
              <tbody>
                <tr>
                  {/* Logo - use max-width/max-height for html2canvas compatibility */}
                  <td style={{ width: "85px", verticalAlign: "middle", textAlign: "center" }}>
                    <img
                      src={logoImg}
                      alt="Logo"
                      style={{
                        maxWidth: "75px",
                        maxHeight: "75px",
                        width: "auto",
                        height: "auto",
                        display: "block",
                      }}
                    />
                  </td>

                  {/* Company Info - table-based centering for html2canvas */}
                  <td style={{ textAlign: "center", verticalAlign: "middle", padding: "0 10px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ textAlign: "center" }}>
                            <span style={{
                              fontSize: "19px",
                              fontWeight: "900",
                              letterSpacing: "0.5px",
                              textTransform: "uppercase",
                              borderBottom: "2px solid #000000",
                              paddingBottom: "2px",
                            }}>
                              {companyProfile?.company_name || "LUAR JENDELA CREATRIP."}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: "center", fontSize: "9.5px", color: "#333333", fontWeight: "500", paddingTop: "4px" }}>
                            {companyProfile?.address || "Jalan Puskesmas Setu RT 4/3 No. 34 Setu, Cipayung, Jakarta Timur 13880"}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: "center", fontSize: "9.5px", color: "#333333" }}>
                            HP. {companyProfile?.phone || "0856 934 999 15"} &nbsp;•&nbsp; Email : {companyProfile?.email || "Luarjendela.cr@gmail.com"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>

                  {/* KWITANSI Green Box */}
                  <td style={{ width: "145px", verticalAlign: "middle", textAlign: "right" }}>
                    <div
                      style={{
                        backgroundColor: "#1b7a43",
                        color: "#ffd700",
                        fontWeight: "900",
                        fontSize: "22px",
                        letterSpacing: "3px",
                        textAlign: "center",
                        padding: "12px 6px",
                        borderRadius: "2px",
                        textTransform: "uppercase",
                      }}
                    >
                      KWITANSI
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ===== KWITANSI BODY TABLE ===== */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #718096" }}>
              <tbody>
                {/* Meta Row: No & Tanggal */}
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #718096", fontSize: "10.5px" }}>
                  <td style={{ width: "55%", padding: "6px 10px", borderRight: "1px solid #718096" }}>
                    <span style={{ fontStyle: "italic", fontWeight: "bold", color: "#4a5568", marginRight: "6px" }}>NO. KWITANSI:</span>
                    <span style={{ fontWeight: "bold", fontFamily: "monospace" }}>{receipt.receipt_number}</span>
                  </td>
                  <td style={{ width: "45%", padding: "6px 10px", textAlign: "right" }}>
                    <span style={{ fontStyle: "italic", fontWeight: "bold", color: "#4a5568", marginRight: "6px" }}>TANGGAL:</span>
                    <span style={{ fontWeight: "500" }}>{formatTanggal(receipt.receipt_date)}</span>
                  </td>
                </tr>

                {/* Telah Terima Dari */}
                <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                  <td style={{ width: "25%", padding: "8px 10px", fontStyle: "italic", fontWeight: "bold", color: "#4a5568", verticalAlign: "top" }}>
                    Telah Terima Dari
                  </td>
                  <td style={{ width: "75%", padding: "8px 10px", fontWeight: "800", textTransform: "uppercase", fontSize: "12px" }}>
                    : {receipt.client_name || "-"}
                  </td>
                </tr>

                {/* Uang Sejumlah (Say / Terbilang) */}
                <tr style={{ backgroundColor: "#ffb703", borderBottom: "2px solid #718096" }}>
                  <td style={{ padding: "8px 10px", fontWeight: "900", color: "#000000", fontSize: "11px", verticalAlign: "top" }}>
                    Uang Sejumlah (Say)
                  </td>
                  <td style={{ padding: "8px 10px", fontStyle: "italic", fontWeight: "bold", color: "#000000", fontSize: "12px" }}>
                    : {receipt.spell_out || "-"}
                  </td>
                </tr>

                {/* Untuk Pembayaran */}
                <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                  <td style={{ padding: "8px 10px", fontStyle: "italic", fontWeight: "bold", color: "#4a5568", verticalAlign: "top" }}>
                    Untuk Pembayaran
                  </td>
                  <td style={{ padding: "8px 10px", color: "#000000", fontWeight: "600" }}>
                    : {receipt.payment_for || "Sewa Bus Pariwisata"}
                  </td>
                </tr>

                {/* Metode Pembayaran */}
                <tr style={{ borderBottom: "1px solid #718096", backgroundColor: "#f8fafc" }}>
                  <td style={{ padding: "8px 10px", fontStyle: "italic", fontWeight: "bold", color: "#4a5568" }}>
                    Metode Pembayaran
                  </td>
                  <td style={{ padding: "8px 10px", color: "#334155" }}>
                    : {receipt.payment_method || "Transfer Bank / Midtrans"}
                  </td>
                </tr>

                {/* Nominal Jumlah Box */}
                <tr style={{ backgroundColor: "#ffb703" }}>
                  <td style={{ padding: "10px", fontWeight: "900", color: "#000000", fontSize: "11px" }}>
                    JUMLAH NOMINAL
                  </td>
                  <td style={{ padding: "10px" }}>
                    <span style={{
                      backgroundColor: "#000000",
                      color: "#ffffff",
                      fontFamily: "monospace",
                      fontWeight: "900",
                      fontSize: "18px",
                      padding: "4px 12px",
                      borderRadius: "3px",
                    }}>
                      {formatRupiah(receipt.amount)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ===== BANK INFO ===== */}
            <div style={{ marginTop: "12px", border: "1px solid #cbd5e1", padding: "6px 10px", backgroundColor: "#f8fafc", fontSize: "9.5px" }}>
              <div style={{ fontWeight: "bold", color: "#000000", marginBottom: "2px" }}>Rekening Resmi Pembayaran:</div>
              <div style={{ color: "#334155" }}>
                Bank: <strong style={{ color: "#000000" }}>{companyProfile?.bank_name || "Bank Central Asia (BCA)"}</strong> | No. Rek: <strong style={{ fontFamily: "monospace", color: "#000000" }}>{companyProfile?.bank_account_no || "166 330 8151"}</strong> a/n <strong style={{ color: "#000000" }}>{companyProfile?.bank_account_holder || "LUAR JENDELA CREATRIP"}</strong>
              </div>
            </div>

            {/* ===== SIGNER & QR FOOTER (Table-based, no flex) ===== */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
              <tbody>
                <tr>
                  {/* Left: QR Verification - table layout instead of flex */}
                  <td style={{ width: "50%", verticalAlign: "bottom" }}>
                    <table style={{ borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ verticalAlign: "middle", paddingRight: "8px" }}>
                            {receipt.qr_signature ? (
                              <img
                                src={receipt.qr_signature}
                                alt="QR Verification"
                                style={{
                                  width: "55px",
                                  height: "55px",
                                  border: "1px solid #cbd5e1",
                                  padding: "2px",
                                  backgroundColor: "#ffffff",
                                  display: "block",
                                }}
                              />
                            ) : (
                              <div style={{
                                width: "55px",
                                height: "55px",
                                border: "1px dashed #cbd5e1",
                                textAlign: "center",
                                lineHeight: "55px",
                                fontSize: "8px",
                                color: "#94a3b8",
                              }}>
                                QR Code
                              </div>
                            )}
                          </td>
                          <td style={{ verticalAlign: "middle", fontSize: "8.5px", color: "#64748b" }}>
                            <div style={{ color: "#166534", fontWeight: "bold" }}>✓ Kwitansi Sah Terverifikasi</div>
                            <div>Scan QR untuk validasi keabsahan dokumen</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>

                  {/* Right: Signer - table-based centering */}
                  <td style={{ width: "50%", textAlign: "center", verticalAlign: "bottom" }}>
                    <table style={{ borderCollapse: "collapse", margin: "0 auto" }}>
                      <tbody>
                        <tr>
                          <td style={{ textAlign: "center", fontSize: "9.5px", color: "#334155" }}>
                            Jakarta, {formatTanggal(receipt.receipt_date)}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: "center", fontSize: "9.5px", color: "#334155" }}>
                            Hormat Kami,
                          </td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: "center", padding: "2px 0" }}>
                            <img
                              src={logoImg}
                              alt="Stamp"
                              style={{
                                maxWidth: "42px",
                                maxHeight: "42px",
                                width: "auto",
                                height: "auto",
                                opacity: "0.85",
                                display: "inline-block",
                              }}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: "center", fontWeight: "bold", textDecoration: "underline", fontSize: "10.5px", color: "#000000" }}>
                            {companyProfile?.signer_name || "Sulton Aziz"}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: "center", fontSize: "9.5px", color: "#475569" }}>
                            {companyProfile?.signer_title || "Direktur"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
