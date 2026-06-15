"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full border-b border-[#3A2818] navbar-glass sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-[family-name:var(--font-display)] text-[#D4A843] text-xl md:text-2xl tracking-[0.2em] uppercase font-bold gold-shimmer">
          Mix Techniques
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="nav-link font-[family-name:var(--font-mono)] text-sm text-[#F0E6D3]/70 hover:text-[#D4A843] transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/pull"
            className="nav-link font-[family-name:var(--font-mono)] text-sm text-[#D4A843]/80 hover:text-[#D4A843] transition-colors border border-[#D4A843]/20 hover:border-[#D4A843]/50 px-3 py-1 rounded"
          >
            🎲 The Pull
          </Link>
        </div>
      </div>
    </nav>
  );
}
