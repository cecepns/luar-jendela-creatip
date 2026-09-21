import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import Modal from "./Modal";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Hapus",
  message = "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.",
  confirmLabel = "Ya, Hapus",
  cancelLabel = "Batal",
  isLoading = false,
  variant = "danger",
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl flex-shrink-0 ${variant === "danger" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600 leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors shadow-sm disabled:opacity-50 ${
            variant === "danger"
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-amber-600 hover:bg-amber-700"
          }`}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
