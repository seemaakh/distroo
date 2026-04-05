"use client";

import { useState, useRef, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Search,
  X,
  Upload,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import { formatPrice } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  brand?: string;
  price: number;
  mrp: number;
  unit: string;
  moq: number;
  stock: number;
  active: boolean;
  image?: string;
  categoryId?: number;
  description?: string;
}

interface Category {
  id: number;
  name: string;
}

const EMPTY: Partial<Product> = {
  name: "",
  brand: "",
  price: 0,
  mrp: 0,
  unit: "pcs",
  moq: 1,
  stock: 0,
  active: true,
  image: "",
  description: "",
};

function ProductsContent() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(
    searchParams.get("action") === "add"
  );
  const [editProduct, setEditProduct] = useState<Partial<Product>>(EMPTY);
  const [isEdit, setIsEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["admin-products", search],
    queryFn: () =>
      api
        .get(`/products?${search ? `q=${search}&` : ""}limit=100&all=1`)
        .then((r) => (Array.isArray(r.data) ? r.data : r.data.products || [])),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  });

  const saveProduct = useMutation({
    mutationFn: (data: Partial<Product>) =>
      isEdit && data.id
        ? api.patch(`/products/${data.id}`, data)
        : api.post("/products", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setShowModal(false);
      setEditProduct(EMPTY);
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.patch(`/products/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const bulkDeactivate = useMutation({
    mutationFn: () =>
      Promise.all(
        selected.map((id) => api.patch(`/products/${id}`, { active: false }))
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setSelected([]);
    },
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await api.post("/products/upload-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditProduct((p) => ({ ...p, image: res.data.url }));
    } catch {
      // Upload failed
    } finally {
      setUploading(false);
    }
  }

  function openAdd() {
    setIsEdit(false);
    setEditProduct(EMPTY);
    setShowModal(true);
  }

  function openEdit(product: Product) {
    setIsEdit(true);
    setEditProduct(product);
    setShowModal(true);
  }

  function toggleSelect(id: number) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveProduct.mutate(editProduct);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-grotesk font-bold text-2xl text-ink">Products</h1>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <button
              onClick={() => bulkDeactivate.mutate()}
              className="flex items-center gap-1.5 text-sm text-red-500 border border-red-200 rounded-xl px-4 py-2 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Deactivate ({selected.length})
            </button>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue hover:bg-blue-dark text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-blue-pale rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-off-white">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="accent-blue"
                      checked={
                        selected.length === products.length &&
                        products.length > 0
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? products.map((p) => p.id) : []
                        )
                      }
                    />
                  </th>
                  {["Image", "Name", "Price", "MOQ", "Stock", "Active", ""].map(
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
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-off-white transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="accent-blue"
                        checked={selected.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative w-10 h-10 bg-blue-pale rounded-lg overflow-hidden">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            📦
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.brand}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-grotesk font-semibold text-blue">
                        {formatPrice(p.price)}
                      </p>
                      <p className="text-xs text-gray-400 line-through">
                        {formatPrice(p.mrp)}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-grotesk text-ink">
                      {p.moq} {p.unit}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-grotesk font-semibold text-sm ${
                          p.stock === 0
                            ? "text-red-500"
                            : p.stock <= p.moq * 2
                            ? "text-amber-600"
                            : "text-green"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          toggleActive.mutate({ id: p.id, active: !p.active })
                        }
                        className={`transition-colors ${
                          p.active ? "text-green" : "text-gray-400"
                        }`}
                      >
                        {p.active ? (
                          <ToggleRight size={22} />
                        ) : (
                          <ToggleLeft size={22} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue hover:bg-blue-pale transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-x-4 top-8 bottom-8 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[560px] bg-white rounded-2xl z-50 flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-grotesk font-semibold text-base text-ink">
                {isEdit ? "Edit Product" : "Add Product"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              {/* Image upload */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Product Image
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 bg-blue-pale rounded-xl overflow-hidden flex-shrink-0">
                    {editProduct.image ? (
                      <Image
                        src={editProduct.image}
                        alt="preview"
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        📦
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 text-xs text-blue border border-blue rounded-lg px-3 py-2 hover:bg-blue-pale disabled:opacity-50 transition-colors"
                    >
                      <Upload size={13} />
                      {uploading ? "Uploading…" : "Upload Image"}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">
                      Or paste URL below
                    </p>
                    <input
                      type="url"
                      value={editProduct.image || ""}
                      onChange={(e) =>
                        setEditProduct((p) => ({ ...p, image: e.target.value }))
                      }
                      placeholder="https://…"
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Product Name *
                  </label>
                  <input
                    required
                    value={editProduct.name || ""}
                    onChange={(e) =>
                      setEditProduct((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Brand
                  </label>
                  <input
                    value={editProduct.brand || ""}
                    onChange={(e) =>
                      setEditProduct((p) => ({ ...p, brand: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Category
                  </label>
                  <select
                    value={editProduct.categoryId || ""}
                    onChange={(e) =>
                      setEditProduct((p) => ({
                        ...p,
                        categoryId: Number(e.target.value) || undefined,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-blue"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Price (Rs) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editProduct.price || ""}
                    onChange={(e) =>
                      setEditProduct((p) => ({
                        ...p,
                        price: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    MRP (Rs) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editProduct.mrp || ""}
                    onChange={(e) =>
                      setEditProduct((p) => ({
                        ...p,
                        mrp: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Unit *
                  </label>
                  <input
                    required
                    value={editProduct.unit || ""}
                    onChange={(e) =>
                      setEditProduct((p) => ({ ...p, unit: e.target.value }))
                    }
                    placeholder="pcs, box, kg…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    MOQ *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editProduct.moq || ""}
                    onChange={(e) =>
                      setEditProduct((p) => ({
                        ...p,
                        moq: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editProduct.stock || ""}
                    onChange={(e) =>
                      setEditProduct((p) => ({
                        ...p,
                        stock: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editProduct.description || ""}
                    onChange={(e) =>
                      setEditProduct((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue resize-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editProduct.active ?? true}
                      onChange={(e) =>
                        setEditProduct((p) => ({
                          ...p,
                          active: e.target.checked,
                        }))
                      }
                      className="accent-blue w-4 h-4"
                    />
                    <span className="text-sm font-medium text-ink">
                      Active (visible to buyers)
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={saveProduct.isPending}
                className="w-full bg-blue hover:bg-blue-dark disabled:bg-gray-200 text-white font-medium py-3 rounded-xl transition-colors"
              >
                {saveProduct.isPending
                  ? "Saving…"
                  : isEdit
                  ? "Save Changes"
                  : "Add Product"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading…</div>}>
      <ProductsContent />
    </Suspense>
  );
}
