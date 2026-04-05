"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { formatPrice } from "@/lib/utils";
import api from "@/lib/api";
import { AlertCircle } from "lucide-react";

const MapLocationPicker = dynamic(
  () => import("@/components/MapLocationPicker"),
  { ssr: false, loading: () => <div className="h-72 bg-blue-pale rounded-xl animate-pulse" /> }
);

interface District {
  id: number;
  name: string;
  deliveryFee: number;
  estimatedDays: number;
  active: boolean;
}

function CheckoutForm() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [storeName, setStoreName] = useState(user?.storeName || "");
  const [address, setAddress] = useState("");
  const [districtId, setDistrictId] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<"ESEWA" | "KHALTI" | "COD">("COD");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: districts = [] } = useQuery<District[]>({
    queryKey: ["districts"],
    queryFn: () => api.get("/districts").then((r) => r.data),
    retry: false,
  });

  const activeDistricts = districts.filter((d) => d.active);
  const selectedDistrict = activeDistricts.find((d) => d.id === districtId);
  const deliveryFee = selectedDistrict?.deliveryFee || 0;
  const total = subtotal() + deliveryFee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    if (!districtId) {
      setError("Please select a delivery district.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post("/orders", {
        storeName,
        deliveryAddress: address,
        deliveryDistrict: districtId,
        deliveryLat: location?.lat ?? null,
        deliveryLng: location?.lng ?? null,
        paymentMethod,
        items: items.map((item) => ({
          productId: item.id,
          qty: item.qty,
          price: item.price,
        })),
      });

      clearCart();
      router.push(`/order-confirm/${res.data.id || res.data.orderId}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to place order. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p className="text-lg font-medium">Your cart is empty</p>
        <a href="/catalogue" className="mt-4 inline-block text-blue hover:underline text-sm">
          Browse Catalogue
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Delivery details */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-grotesk font-semibold text-base text-ink mb-5">
              Delivery Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-ink block mb-1.5">
                  Store Name
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  placeholder="e.g. Ram General Store"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink block mb-1.5">
                  Delivery Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  rows={3}
                  placeholder="Street, tole, landmark…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink block mb-1.5">
                  District
                </label>
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(Number(e.target.value) || "")}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-blue text-ink"
                >
                  <option value="">Select district…</option>
                  {activeDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — Rs {d.deliveryFee.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Map */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-grotesk font-semibold text-base text-ink mb-5">
              Pin Your Store Location
            </h2>
            <MapLocationPicker
              onLocationChange={(loc) => setLocation(loc)}
            />
          </section>

          {/* Payment */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-grotesk font-semibold text-base text-ink mb-5">
              Payment Method
            </h2>
            <div className="space-y-3">
              {(
                [
                  { value: "ESEWA", label: "eSewa", sub: "Digital wallet" },
                  { value: "KHALTI", label: "Khalti", sub: "Digital wallet" },
                  { value: "COD", label: "Cash on Delivery", sub: "Pay when delivered" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === opt.value
                      ? "border-blue bg-blue-pale"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={opt.value}
                    checked={paymentMethod === opt.value}
                    onChange={() => setPaymentMethod(opt.value)}
                    className="accent-blue"
                  />
                  <div>
                    <p className="text-sm font-semibold text-ink">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Summary */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-20">
            <h2 className="font-grotesk font-semibold text-base text-ink mb-4">
              Order Summary
            </h2>

            <ul className="space-y-3 mb-4">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {item.qty} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <p className="text-sm font-grotesk font-medium text-ink">
                    {formatPrice(item.price * item.qty)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-grotesk font-medium">
                  {formatPrice(subtotal())}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery ({selectedDistrict?.name || "—"})</span>
                <span className="font-grotesk font-medium">
                  {deliveryFee > 0 ? formatPrice(deliveryFee) : "—"}
                </span>
              </div>
              <div className="flex justify-between font-grotesk font-bold text-base text-ink border-t border-gray-200 pt-3">
                <span>Total</span>
                <span className="text-blue">{formatPrice(total)}</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 text-red-500 bg-red-50 rounded-xl p-3 text-xs">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full bg-blue hover:bg-blue-dark disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition-colors shadow-lg shadow-blue/20"
            >
              {submitting ? "Placing Order…" : "Place Order"}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              By placing an order you agree to our terms of service
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-grotesk font-bold text-2xl text-ink mb-8">
        Checkout
      </h1>
      <Suspense fallback={<div className="text-gray-400">Loading…</div>}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
