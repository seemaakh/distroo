"use client";

import Link from "next/link";
import { ShoppingCart, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import CartDrawer from "./CartDrawer";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems, openCart } = useCartStore();
  const count = totalItems();

  const navLinks = [
    { href: "/catalogue", label: "Catalogue" },
    { href: "/coverage", label: "Coverage" },
    { href: "/track", label: "Track Order" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 h-16 backdrop-blur-md bg-white/80 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="font-grotesk font-bold text-2xl text-blue tracking-tight"
          >
            DISTRO
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-blue transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <button
              onClick={openCart}
              className="relative p-2 rounded-lg hover:bg-blue-pale transition-colors"
              aria-label="Open cart"
            >
              <ShoppingCart size={22} className="text-ink" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue text-white text-xs font-grotesk font-bold rounded-full flex items-center justify-center px-1">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>

            {/* Login */}
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-blue border border-blue rounded-lg px-3 py-1.5 hover:bg-blue-pale transition-colors"
            >
              <User size={16} />
              Login
            </Link>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-blue-pale"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md">
            <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-gray-600 hover:text-blue py-2 px-3 rounded-lg hover:bg-blue-pale transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-1.5 text-sm font-medium text-blue py-2 px-3 rounded-lg hover:bg-blue-pale transition-colors"
              >
                <User size={16} />
                Login
              </Link>
            </nav>
          </div>
        )}
      </header>

      <CartDrawer />
    </>
  );
}
