"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/admin/OrderMapView"), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-blue-pale rounded-xl animate-pulse flex items-center justify-center">
      <MapPin size={24} className="text-blue animate-pulse" />
    </div>
  ),
});

interface Order {
  id: number;
  orderNumber: string;
  status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  storeName: string;
  buyerPhone: string;
  deliveryAddress: string;
  deliveryDistrict: string;
  deliveryLat?: number;
  deliveryLng?: number;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  items: { id: number; productName: string; qty: number; price: number; unit: string }[];
}

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  CONFIRMED: "bg-blue-light text-blue",
  PROCESSING: "bg-purple-50 text-purple-600",
  SHIPPED: "bg-indigo-50 text-indigo-600",
  DELIVERED: "bg-green-light text-green",
  CANCELLED: "bg-red-50 text-red-500",
};

function OrdersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(
    searchParams.get("id") ? Number(searchParams.get("id")) : null
  );

  const { data: ordersData, isLoading } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ["admin-orders", statusFilter, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter !== "ALL") p.set("status", statusFilter);
      if (search) p.set("q", search);
      p.set("limit", "50");
      return api.get(`/orders?${p.toString()}`).then((r) =>
        Array.isArray(r.data)
          ? { orders: r.data, total: r.data.length }
          : r.data
      );
    },
  });

  const orders = ordersData?.orders || [];
  const selectedOrder = orders.find((o) => o.id === selectedId);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)]">
      {/* Left: orders list */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-5 space-y-3">
          <h1 className="font-grotesk font-bold text-2xl text-ink">Orders</h1>

          {/* Status tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? "bg-blue text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-blue"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order number, store name, phone…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-2xl">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-blue-pale rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p>No orders found.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-off-white sticky top-0">
                <tr>
                  {["#", "Store", "Status", "Payment", "Total", "Date"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => {
                      setSelectedId(o.id);
                      router.replace(`/admin/orders?id=${o.id}`, { scroll: false });
                    }}
                    className={`cursor-pointer hover:bg-off-white transition-colors ${
                      selectedId === o.id ? "bg-blue-pale" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-grotesk font-semibold text-ink">
                      #{o.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">
                      <p className="truncate">{o.storeName}</p>
                      <p className="text-xs text-gray-400">{o.buyerPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                          STATUS_STYLES[o.status] || ""
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {o.paymentMethod}
                    </td>
                    <td className="px-4 py-3 font-grotesk font-semibold text-blue">
                      {formatPrice(o.total)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString("en-NP", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      {selectedOrder && (
        <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col overflow-hidden bg-white border border-gray-200 rounded-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <p className="font-grotesk font-bold text-sm text-ink">
              #{selectedOrder.orderNumber}
            </p>
            <button
              onClick={() => {
                setSelectedId(null);
                router.replace("/admin/orders", { scroll: false });
              }}
              className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Status picker */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-2">
                Order Status
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {STATUSES.filter((s) => s !== "ALL").map((s) => (
                  <button
                    key={s}
                    disabled={updateStatus.isPending}
                    onClick={() =>
                      updateStatus.mutate({
                        id: selectedOrder.id,
                        status: s,
                      })
                    }
                    className={`text-xs font-medium py-1.5 px-2 rounded-lg border transition-colors ${
                      selectedOrder.status === s
                        ? "border-blue bg-blue text-white"
                        : "border-gray-200 hover:border-blue text-gray-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Map */}
            {selectedOrder.deliveryLat && selectedOrder.deliveryLng && (
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-2">
                  Delivery Location
                </label>
                <MapView
                  lat={selectedOrder.deliveryLat}
                  lng={selectedOrder.deliveryLng}
                />
              </div>
            )}

            {/* Delivery info */}
            <div className="bg-off-white rounded-xl p-3 text-xs space-y-1.5 text-gray-600">
              <p>
                <span className="font-medium text-ink">Store:</span>{" "}
                {selectedOrder.storeName}
              </p>
              <p>
                <span className="font-medium text-ink">Phone:</span>{" "}
                {selectedOrder.buyerPhone}
              </p>
              <p>
                <span className="font-medium text-ink">Address:</span>{" "}
                {selectedOrder.deliveryAddress}, {selectedOrder.deliveryDistrict}
              </p>
              <p>
                <span className="font-medium text-ink">Payment:</span>{" "}
                {selectedOrder.paymentMethod} · {selectedOrder.paymentStatus}
              </p>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Items
              </p>
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden">
                {selectedOrder.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between px-3 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-medium text-ink">{item.productName}</p>
                      <p className="text-gray-400">
                        {item.qty} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className="font-grotesk font-semibold text-ink">
                      {formatPrice(item.price * item.qty)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-xs border-t border-gray-200 pt-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>{formatPrice(selectedOrder.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-grotesk font-bold text-sm text-ink">
                <span>Total</span>
                <span className="text-blue">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading…</div>}>
      <OrdersContent />
    </Suspense>
  );
}
