import React, { useState, useRef } from "react";
import html2pdf from "html2pdf.js";
import toast from "react-hot-toast";
import { Download, CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import Modal from "./Modal";
import logoImg from "@/assets/logo.png";
import { formatRupiah, formatTanggal, terbilang } from "@/utils/formatters";

export default function PrintInvoiceModal({
  isOpen,
  onClose,
  invoice,
  companyProfile,
  onPayMidtrans,
}) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printAreaRef = useRef(null);

  if (!invoice) return null;

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    toast.loading("Sedang membuat file PDF...", { id: "pdf-toast" });

    try {
      const element = printAreaRef.current;
      const cleanFileName = `Invoice_${invoice.invoice_number.replace(/[\/\\]/g, "-")}.pdf`;

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
      toast.success("File PDF Invoice berhasil diunduh!", { id: "pdf-toast" });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Gagal membuat file PDF. Silakan coba lagi.", { id: "pdf-toast" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const isPaid = invoice.payment_status === "LUNAS";
  const subtotal = Number(invoice.subtotal) || 0;
  const paidAmount = Number(invoice.paid_amount) || 0;
  const totalAmount = Number(invoice.total_amount) || subtotal;
  const sisa = Math.max(0, totalAmount - paidAmount);

  const terbilangText = terbilang(paidAmount > 0 && !isPaid ? paidAmount : totalAmount);
  const dpPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Resmi Luar Jendela Creatrip" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
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

          <div className="flex items-center gap-2">
            {!isPaid && onPayMidtrans && (
              <button
                type="button"
                onClick={() => onPayMidtrans(invoice)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Bayar via Midtrans
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

        {/* INVOICE CANVAS */}
        <div className="overflow-x-auto bg-slate-100 p-2 sm:p-4 rounded-xl flex justify-center">
          <div
            ref={printAreaRef}
            style={{
              width: "690px",
              minHeight: "980px",
              backgroundColor: "#ffffff",
              padding: "20px 24px",
              boxSizing: "border-box",
              color: "#000000",
              fontFamily: "Inter, system-ui, -apple-system, sans-serif",
              fontSize: "11px",
              lineHeight: "1.35",
            }}
          >
            {/* ===== HEADER TABLE ===== */}
            <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "2px solid #000000", paddingBottom: "8px", marginBottom: "10px" }}>
              <tbody>
                <tr>
                  {/* Logo - use max-width/max-height instead of object-fit for html2canvas */}
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

                  {/* Company Info - use table-based centering for html2canvas compatibility */}
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

                  {/* INVOICE Green Box */}
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
                      INVOICE
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ===== BILL TO & INVOICE META ===== */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #718096", marginBottom: "0px" }}>
              <tbody>
                <tr>
                  {/* Left: Bill To */}
                  <td style={{ width: "54%", borderRight: "1px solid #718096", padding: "6px 8px", verticalAlign: "top" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ width: "65px", fontStyle: "italic", fontWeight: "bold", color: "#4a5568", verticalAlign: "top" }}>
                            BILL TO
                          </td>
                          <td style={{ fontWeight: "800", color: "#000000", textTransform: "uppercase", fontSize: "11px" }}>
                            : {invoice.client_name || "-"}
                          </td>
                        </tr>
                        {invoice.client_address && (
                          <tr>
                            <td></td>
                            <td style={{ fontSize: "9.5px", color: "#4a5568", paddingTop: "2px" }}>
                              {invoice.client_address}
                            </td>
                          </tr>
                        )}
                        {invoice.client_phone && (
                          <tr>
                            <td></td>
                            <td style={{ fontSize: "9.5px", color: "#4a5568" }}>
                              Telp: {invoice.client_phone}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </td>

                  {/* Right: Meta (Invoice No, Date, Due Date) */}
                  <td style={{ width: "46%", padding: "6px 8px", verticalAlign: "top" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
                      <tbody>
                        <tr>
                          <td style={{ fontStyle: "italic", fontWeight: "bold", color: "#4a5568", width: "95px" }}>
                            INVOICE NO.
                          </td>
                          <td style={{ fontWeight: "bold", fontFamily: "monospace", textAlign: "right", whiteSpace: "nowrap" }}>
                            : {invoice.invoice_number}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontStyle: "italic", fontWeight: "bold", color: "#4a5568" }}>
                            DATE
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            : {formatTanggal(invoice.invoice_date)}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontStyle: "italic", fontWeight: "bold", color: "#4a5568" }}>
                            DUE DATE
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            : {formatTanggal(invoice.due_date)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ===== CURRENCY SEPARATOR BAR ===== */}
            <table style={{ width: "100%", borderCollapse: "collapse", borderLeft: "1px solid #718096", borderRight: "1px solid #718096", backgroundColor: "#f7fafc", textAlign: "center", fontSize: "9.5px", fontWeight: "bold" }}>
              <tbody>
                <tr>
                  <td style={{ width: "25%", padding: "2px" }}>-</td>
                  <td style={{ width: "35%", padding: "2px" }}>-</td>
                  <td style={{ width: "20%", padding: "2px", fontWeight: "900", letterSpacing: "1px" }}>IDR</td>
                  <td style={{ width: "20%", padding: "2px" }}>-</td>
                </tr>
              </tbody>
            </table>

            {/* ===== ITEMS TABLE ===== */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #718096", borderTop: "2px solid #145a32" }}>
              <thead>
                <tr style={{ backgroundColor: "#145a32", color: "#ffffff", fontSize: "10px", fontWeight: "bold", letterSpacing: "0.5px" }}>
                  <th style={{ width: "6%", padding: "5px 4px", textAlign: "center", borderRight: "1px solid #48bb78" }}>NO.</th>
                  <th style={{ width: "52%", padding: "5px 8px", textAlign: "left", borderRight: "1px solid #48bb78" }}>DESKRIPSI</th>
                  <th style={{ width: "8%", padding: "5px 4px", textAlign: "center", borderRight: "1px solid #48bb78" }}>QTY</th>
                  <th style={{ width: "17%", padding: "5px 6px", textAlign: "right", borderRight: "1px solid #48bb78" }}>HARGA SATUAN</th>
                  <th style={{ width: "17%", padding: "5px 6px", textAlign: "right" }}>JUMLAH</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ minHeight: "65px", verticalAlign: "top", fontSize: "10.5px" }}>
                  <td style={{ textAlign: "center", padding: "8px 4px", borderRight: "1px solid #718096", borderBottom: "1px solid #718096" }}>
                    1.
                  </td>
                  <td style={{ padding: "8px 8px", borderRight: "1px solid #718096", borderBottom: "1px solid #718096" }}>
                    <div style={{ fontWeight: "bold", color: "#000000" }}>
                      Sewa Armada ({invoice.destination || "Perjalanan Wisata"})
                    </div>
                    <div style={{ fontSize: "9.5px", color: "#4a5568", marginTop: "2px" }}>
                      Tanggal: {formatTanggal(invoice.usage_date || invoice.due_date)}
                    </div>
                    <div style={{ fontSize: "9.5px", color: "#4a5568" }}>
                      Tujuan: {invoice.destination || "-"}
                    </div>
                  </td>
                  <td style={{ textAlign: "center", padding: "8px 4px", borderRight: "1px solid #718096", borderBottom: "1px solid #718096" }}>
                    1
                  </td>
                  <td style={{ textAlign: "right", padding: "8px 6px", fontFamily: "monospace", borderRight: "1px solid #718096", borderBottom: "1px solid #718096" }}>
                    {formatRupiah(subtotal)}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px 6px", fontFamily: "monospace", fontWeight: "bold", borderBottom: "1px solid #718096" }}>
                    {formatRupiah(subtotal)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ===== TOTALS & SAY ROW (Yellow) ===== */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #718096", borderTop: "none", backgroundColor: "#ffb703" }}>
              <tbody>
                <tr>
                  {/* Left: Say (Terbilang) */}
                  <td style={{ width: "66%", padding: "8px 10px", borderRight: "1px solid #718096", verticalAlign: "middle" }}>
                    <span style={{ fontWeight: "900", color: "#000000", fontSize: "11px", marginRight: "6px" }}>Say :</span>
                    <span style={{ fontStyle: "italic", fontWeight: "bold", color: "#000000", fontSize: "11px" }}>
                      {terbilangText}
                    </span>
                  </td>

                  {/* Right: Calculations */}
                  <td style={{ width: "34%", padding: "6px 8px", verticalAlign: "middle", fontSize: "10.5px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ fontStyle: "italic", fontWeight: "bold", color: "#000000" }}>Total Harga</td>
                          <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: "bold", color: "#000000" }}>
                            {formatRupiah(totalAmount)}
                          </td>
                        </tr>
                        {paidAmount > 0 && (
                          <tr>
                            <td style={{ fontStyle: "italic", fontWeight: "bold", color: "#000000", paddingTop: "2px" }}>
                              Down Payment {dpPercent}%
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: "bold", color: "#000000", paddingTop: "2px" }}>
                              {formatRupiah(paidAmount)}
                            </td>
                          </tr>
                        )}
                        {sisa > 0 && (
                          <tr style={{ borderTop: "1px solid #d97706" }}>
                            <td style={{ fontStyle: "italic", fontWeight: "bold", color: "#78350f", paddingTop: "2px" }}>
                              Sisa Pelunasan
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: "bold", color: "#78350f", paddingTop: "2px" }}>
                              {formatRupiah(sisa)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ===== INFORMASI PEMBAYARAN ===== */}
            <div style={{ marginTop: "10px", border: "1px solid #cbd5e1", padding: "6px 10px", backgroundColor: "#f8fafc", fontSize: "9.5px" }}>
              <div style={{ fontWeight: "bold", color: "#000000", marginBottom: "3px", fontSize: "10px" }}>
                Informasi Pembayaran :
              </div>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "110px", color: "#475569" }}>Nama Penerima</td>
                    <td style={{ fontWeight: "bold", color: "#000000" }}>: {companyProfile?.bank_account_holder || "LUAR JENDELA CREATRIP"}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#475569" }}>Bank</td>
                    <td style={{ fontWeight: "bold", color: "#000000" }}>: {companyProfile?.bank_name || "Bank Central Asia (BCA)"}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#475569" }}>Nomor Rekening</td>
                    <td style={{ fontWeight: "bold", fontFamily: "monospace", color: "#000000" }}>: {companyProfile?.bank_account_no || "166 330 8151"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ===== SYARAT & KETENTUAN (15 Points) ===== */}
            <div style={{ marginTop: "8px", border: "1px solid #cbd5e1", padding: "6px 10px", fontSize: "8.5px", lineHeight: "1.3" }}>
              <div style={{ fontWeight: "bold", color: "#000000", marginBottom: "3px" }}>Syarat & Ketentuan :</div>
              <table style={{ borderCollapse: "collapse", width: "100%", color: "#334155" }}>
                <tbody>
                  <tr><td style={{ width: "16px", verticalAlign: "top" }}>1.</td><td>Harga SUDAH TERMASUK biaya bahan bakar dan jasa supir</td></tr>
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

            {/* ===== SIGNATURE & QR FOOTER (Table-based, no flex) ===== */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px" }}>
              <tbody>
                <tr>
                  {/* Left: QR Code Verification - use table instead of flex for html2canvas */}
                  <td style={{ width: "50%", verticalAlign: "bottom" }}>
                    <table style={{ borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ verticalAlign: "middle", paddingRight: "8px" }}>
                            {invoice.qr_signature ? (
                              <img
                                src={invoice.qr_signature}
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
                            <div style={{ color: "#166534", fontWeight: "bold" }}>✓ Terverifikasi Resmi</div>
                            <div>Scan QR untuk cek keaslian dokumen</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>

                  {/* Right: Signer */}
                  <td style={{ width: "50%", textAlign: "center", verticalAlign: "bottom" }}>
                    <table style={{ borderCollapse: "collapse", margin: "0 auto" }}>
                      <tbody>
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
