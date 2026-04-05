"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, ChevronLeft, Minus, Plus } from "lucide-react";
import api from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { formatPrice, getStockLabel } from "@/lib/utils";
import { Product } from "@/components/ProductCard";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCartStore();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["product", id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const [qty, setQty] = useState<number | null>(null);

  const moq = product?.moq || 1;
  const currentQty = qty ?? moq;

  function decrement() {
    if (currentQty - moq >= moq) setQty(currentQty - moq);
  }
  function increment() {
    setQty(currentQty + moq);
  }

  function handleAddToCart() {
    if (!product) return;
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        mrp: product.mrp,
        unit: product.unit,
        moq: product.moq,
        image: product.image,
        brand: product.brand,
      },
      currentQty
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8">
        <div className="aspect-square bg-blue-pale rounded-2xl animate-pulse" />
        <div className="space-y-4">
          <div className="h-6 bg-blue-pale rounded animate-pulse w-1/3" />
          <div className="h-8 bg-blue-pale rounded animate-pulse w-3/4" />
          <div className="h-6 bg-blue-pale rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center text-gray-400">
        <p className="text-lg font-medium">Product not found</p>
        <Link
          href="/catalogue"
          className="mt-4 inline-flex items-center gap-1 text-blue hover:underline text-sm"
        >
          <ChevronLeft size={14} /> Back to Catalogue
        </Link>
      </div>
    );
  }

  const stockInfo = getStockLabel(product.stock, product.moq);
  const discount = Math.round(
    ((product.mrp - product.price) / product.mrp) * 100
  );
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/catalogue"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-blue mb-6 transition-colors"
      >
        <ChevronLeft size={14} /> Back to Catalogue
      </Link>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="relative aspect-square bg-blue-pale rounded-2xl overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">📦</span>
            </div>
          )}
          {discount > 0 && (
            <span className="absolute top-4 left-4 bg-green text-white text-sm font-grotesk font-bold px-3 py-1 rounded-full">
              -{discount}%
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4">
          {product.brand && (
            <span className="inline-flex self-start bg-blue-light text-blue text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
              {product.brand}
            </span>
          )}

          <h1 className="font-grotesk font-bold text-2xl sm:text-3xl text-ink">
            {product.name}
          </h1>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${stockInfo.color}`}
            >
              {stockInfo.label}
            </span>
            <span className="text-xs text-gray-400">{product.unit}</span>
          </div>

          {/* Price */}
          <div className="flex items-end gap-3">
            <span className="font-grotesk font-bold text-3xl text-blue">
              {formatPrice(product.price)}
            </span>
            {product.mrp > product.price && (
              <span className="price-mrp text-base mb-1">
                {formatPrice(product.mrp)}
              </span>
            )}
          </div>

          {/* MOQ */}
          <div className="bg-blue-pale rounded-xl p-4">
            <p className="text-sm text-gray-600">
              <span className="font-grotesk font-semibold text-ink">
                Minimum order:
              </span>{" "}
              {product.moq} {product.unit}
            </p>
            {product.stock > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {product.stock} {product.unit} available
              </p>
            )}
          </div>

          {/* Qty selector */}
          {!isOutOfStock && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl p-1">
                <button
                  onClick={decrement}
                  disabled={currentQty <= moq}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-blue-pale disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="font-grotesk font-bold text-xl w-12 text-center">
                  {currentQty}
                </span>
                <button
                  onClick={increment}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-blue-pale transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <span className="text-sm text-gray-400">
                = {formatPrice(product.price * currentQty)}
              </span>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full flex items-center justify-center gap-2 bg-blue hover:bg-blue-dark disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl text-base transition-colors shadow-lg shadow-blue/20"
          >
            <ShoppingCart size={20} />
            {isOutOfStock ? "Out of Stock" : "Add to Cart"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Payments: eSewa · Khalti · Cash on Delivery
          </p>
        </div>
      </div>
    </div>
  );
}
