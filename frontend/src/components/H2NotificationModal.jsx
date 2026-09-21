import React from "react";
import { Bell, Calendar, Clock, MapPin, User, Phone, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import Modal from "./Modal";
import { formatTanggal, formatRupiah, getStatusBadge } from "@/utils/formatters";

export default function H2NotificationModal({
  isOpen,
  onClose,
  upcomingList = [],
  onSelectOrder,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔔 Pengingat Jadwal Keberangkatan (H-2)"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Banner Alert */}
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="text-sm">
            <h4 className="font-semibold text-amber-900">
              Ada {upcomingList.length} pesanan yang akan berangkat dalam 2 hari ke depan (H-2)!
            </h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Mohon cek kesiapan armada, driver, dan status pelunasan pembayaran pelanggan berikut.
            </p>
          </div>
        </div>

        {/* List of H-2 Orders */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {upcomingList.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              Tidak ada jadwal keberangkatan pada H-2 saat ini.
            </div>
          ) : (
            upcomingList.map((order) => {
              const badge = getStatusBadge(order.status);
              const isPaid = order.status === "LUNAS";

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-md transition-all group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                        {order.reservation_number}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {order.fleet_name} ({order.license_plate})
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-slate-800 truncate">
                        {order.destination}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{formatTanggal(order.usage_date)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>Jemput: {order.pickup_time || "07:00"} WIB</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">PIC: {order.pic_name} ({order.pic_phone})</span>
                    </div>
                  </div>

                  {/* Financial summary & Action */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span>Total: <strong className="text-slate-800">{formatRupiah(order.total_price)}</strong></span>
                      {!isPaid && (
                        <span className="text-rose-600 font-medium">
                          Sisa: {formatRupiah(order.remaining_payment)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${order.pic_phone?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-medium transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Hubungi PIC
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onSelectOrder) onSelectOrder(order);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-brand-700 bg-brand-50 hover:bg-brand-100 font-medium transition-colors"
                      >
                        Detail
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-sm"
          >
            Mengerti, Tutup Pengingat
          </button>
        </div>
      </div>
    </Modal>
  );
}
