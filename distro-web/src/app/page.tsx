"use client";

import Link from "next/link";
import { ArrowRight, Package, MapPin } from "lucide-react";
import TickerBar from "@/components/TickerBar";
import ProductCard, { Product } from "@/components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface Category {
  id: number;
  name: string;
  emoji: string;
  productCount?: number;
}

export default function HomePage() {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
    retry: false,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", "newest"],
    queryFn: () =>
      api.get("/products?sort=newest&limit=12").then((r) => r.data.products ?? []),
    retry: false,
  });

  const fallbackCategories: Category[] = [
    { id: 1, name: "Beverages", emoji: "🥤" },
    { id: 2, name: "Snacks", emoji: "🍿" },
    { id: 3, name: "Dairy", emoji: "🥛" },
    { id: 4, name: "Household", emoji: "🧹" },
    { id: 5, name: "Personal Care", emoji: "🧴" },
    { id: 6, name: "Stationery", emoji: "✏️" },
    { id: 7, name: "Electronics", emoji: "🔌" },
    { id: 8, name: "Food Grains", emoji: "🌾" },
  ];

  const displayCategories = categories.length > 0 ? categories : fallbackCategories;

  return (
    <>
      <TickerBar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-pale via-white to-blue-light py-20 sm:py-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue text-sm font-medium uppercase tracking-widest mb-4">
            Nepal&apos;s B2B Wholesale Platform
          </p>
          <h1 className="font-grotesk font-bold text-4xl sm:text-5xl lg:text-6xl text-ink leading-tight mb-4">
            Wholesale,{" "}
            <span className="text-blue">made simple.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 font-medium mb-3">
            Order in bulk. Deliver to your door.
          </p>
          <p className="text-gray-400 text-base mb-10 max-w-xl mx-auto">
            Nepal&apos;s easiest B2B ordering platform for shopkeepers. Browse
            thousands of products, place bulk orders, and get doorstep delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/catalogue"
              className="inline-flex items-center justify-center gap-2 bg-blue hover:bg-blue-dark text-white font-medium px-8 py-3.5 rounded-xl text-base transition-colors shadow-lg shadow-blue/20"
            >
              Browse Catalogue
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/track"
              className="inline-flex items-center justify-center gap-2 border-2 border-blue text-blue hover:bg-blue-pale font-medium px-8 py-3.5 rounded-xl text-base transition-colors"
            >
              Track My Order
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: "Active Districts", value: "20+" },
            { label: "Products Available", value: "500+" },
            { label: "Registered Shops", value: "1,200+" },
            { label: "Orders Delivered", value: "15,000+" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-grotesk font-bold text-2xl sm:text-3xl text-blue">
                {stat.value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-grotesk font-bold text-2xl text-ink">
            Shop by Category
          </h2>
          <Link
            href="/catalogue"
            className="text-blue text-sm font-medium hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
          {displayCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/catalogue?category=${cat.id}`}
              className="group flex flex-col items-center gap-3 bg-white border border-gray-200 hover:border-blue hover:shadow-md rounded-2xl py-6 px-4 text-center transition-all duration-200"
            >
              <span className="text-4xl group-hover:scale-110 transition-transform">
                {cat.emoji}
              </span>
              <span className="text-sm font-medium text-ink">{cat.name}</span>
              {cat.productCount !== undefined && (
                <span className="text-xs text-gray-400">
                  {cat.productCount} items
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white border-y border-gray-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-grotesk font-bold text-2xl text-ink">
              Newest Products
            </h2>
            <Link
              href="/catalogue?sort=newest"
              className="text-blue text-sm font-medium hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package size={48} strokeWidth={1.2} className="mx-auto mb-4" />
              <p>No products yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Coverage CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="bg-gradient-to-r from-blue to-blue-dark rounded-3xl px-8 py-12 sm:py-16 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white" />
            <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-white" />
          </div>
          <MapPin size={40} className="mx-auto mb-4 opacity-90" />
          <h2 className="font-grotesk font-bold text-2xl sm:text-3xl mb-3">
            We deliver across Nepal
          </h2>
          <p className="text-blue-light text-base mb-8 max-w-md mx-auto">
            Delivering to 20+ districts with competitive shipping rates. Check
            if we cover your area.
          </p>
          <Link
            href="/coverage"
            className="inline-flex items-center gap-2 bg-white text-blue font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-pale transition-colors"
          >
            View Coverage Map
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
