/**
 * Format number to Indonesian Rupiah currency format
 * e.g., 6500000 -> "Rp 6.500.000"
 */
export const formatRupiah = (number) => {
  if (number === null || number === undefined || isNaN(number)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

/**
 * Format Date to readable Indonesian format
 * e.g., 2026-09-23 -> "23 September 2026"
 */
export const formatTanggal = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
};

/**
 * Format Date to short Indonesian format
 * e.g., "23 Sep 2026"
 */
export const formatTanggalShort = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
};

/**
 * Terbilang generator in Indonesian
 */
export const terbilang = (n) => {
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return "Nol Rupiah";

  function konversi(x) {
    if (x < 12) return angka[x];
    if (x < 20) return konversi(x - 10) + " Belas";
    if (x < 100) return konversi(Math.floor(x / 10)) + " Puluh " + konversi(x % 10);
    if (x < 200) return "Seratus " + konversi(x - 100);
    if (x < 1000) return konversi(Math.floor(x / 100)) + " Ratus " + konversi(x % 100);
    if (x < 2000) return "Seribu " + konversi(x - 1000);
    if (x < 1000000) return konversi(Math.floor(x / 1000)) + " Ribu " + konversi(x % 1000);
    if (x < 1000000000) return konversi(Math.floor(x / 1000000)) + " Juta " + konversi(x % 1000000);
    if (x < 1000000000000) return konversi(Math.floor(x / 1000000000)) + " Miliar " + konversi(x % 1000000000);
    return konversi(Math.floor(x / 1000000000000)) + " Triliun " + konversi(x % 1000000000000);
  }

  return konversi(num).replace(/\s+/g, ' ').trim() + " Rupiah";
};

/**
 * Status color classes
 */
export const getStatusBadge = (status) => {
  switch (status) {
    case "LUNAS":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "LUNAS",
        dot: "bg-emerald-500",
      };
    case "DP":
      return {
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Uang Muka (DP)",
        dot: "bg-amber-500",
      };
    case "Booking":
    case "Belum Lunas":
      return {
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        label: status === "Belum Lunas" ? "Belum Lunas" : "Booking",
        dot: "bg-blue-500",
      };
    case "BATAL":
      return {
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        label: "Dibatalkan",
        dot: "bg-rose-500",
      };
    default:
      return {
        bg: "bg-slate-50 text-slate-700 border-slate-200",
        label: status || "-",
        dot: "bg-slate-400",
      };
  }
};
