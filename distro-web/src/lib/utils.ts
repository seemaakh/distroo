export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("ne-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("NPR", "Rs");
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function debounce(fn: (val: string) => void, ms: number): (val: string) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (val: string) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(val), ms);
  };
}

export function getStockLabel(stock: number, moq: number): {
  label: string;
  color: string;
} {
  if (stock <= 0) return { label: "Out of Stock", color: "text-red-500 bg-red-50" };
  if (stock <= moq * 2) return { label: "Low Stock", color: "text-orange-500 bg-orange-50" };
  return { label: "In Stock", color: "text-green bg-green-light" };
}
