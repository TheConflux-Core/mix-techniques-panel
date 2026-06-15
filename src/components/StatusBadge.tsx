"use client";

import { STATUS_COLORS } from "@/lib/types";

interface StatusBadgeProps {
  status: string;
}

const STATUS_GLOW: Record<string, string> = {
  submitted: "shadow-[0_0_8px_rgba(212,168,67,0.2)]",
  under_review: "shadow-[0_0_8px_rgba(232,155,46,0.25)]",
  selected: "shadow-[0_0_10px_rgba(212,168,67,0.3)]",
  aired: "shadow-[0_0_8px_rgba(21,128,61,0.25)]",
  scored: "shadow-[0_0_8px_rgba(147,51,234,0.25)]",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorClasses = STATUS_COLORS[status] || "border-[#3A2818] text-[#F0E6D3]/50";
  const glowClass = STATUS_GLOW[status] || "";
  const isOutlined = status === "submitted";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-[family-name:var(--font-mono)] font-medium transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(212,168,67,0.3)] ${
        isOutlined ? `border ${colorClasses}` : colorClasses
      } ${glowClass}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
