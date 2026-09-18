export const DASHBOARD_COLORS = {
  balance: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-600", chart: "#2563eb" },
  revenue: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-600", chart: "#059669" },
  expense: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-600", chart: "#dc2626" },
  projects: { bg: "bg-violet-50", text: "text-violet-700", icon: "text-violet-600", chart: "#7c3aed" },
  clients: { bg: "bg-orange-50", text: "text-orange-700", icon: "text-orange-600", chart: "#ea580c" },
  contacts: { bg: "bg-teal-50", text: "text-teal-700", icon: "text-teal-600", chart: "#0d9488" },
  transactions: { bg: "bg-slate-50", text: "text-slate-700", icon: "text-slate-600", chart: "#475569" },
} as const;

export const PAYMENT_MODE_LABELS: Record<"CASH" | "UPI" | "CARD" | "NEFT" | "IMPS" | "OTHER", string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  NEFT: "NEFT",
  IMPS: "IMPS",
  OTHER: "Other",
};

export const PAYMENT_MODE_CHART_COLORS: Record<"CASH" | "UPI" | "CARD" | "NEFT" | "IMPS" | "OTHER", string> = {
  CASH: "#059669",
  UPI: "#7c3aed",
  CARD: "#0284c7",
  NEFT: "#d97706",
  IMPS: "#4f46e5",
  OTHER: "#78716c",
};
