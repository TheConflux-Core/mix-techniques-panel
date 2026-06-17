import Navbar from "@/components/Navbar";

export default function TestButtonPage() {
  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="fixed inset-0 carbon-fiber pointer-events-none" />
      <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50" />
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-[#D4A843] uppercase tracking-[0.2em] font-bold gold-shimmer">
                Show Runner
              </h1>
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm mt-2 uppercase tracking-wider">
                Live episode control
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full transition-all bg-red-500" />
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider" style={{ color: "rgba(196,57,42,0.5)" }}>
                  Overlays Offline
                </span>
              </div>
              <button className="font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-4 py-2 rounded font-semibold">
                + New Episode
              </button>
            </div>
          </div>

          <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden mb-8">
            <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
              No active episode. Create one to get started.
            </p>
          </div>

          <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden mt-8">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[#F0E6D3]/60 uppercase tracking-[0.15em] font-bold mb-4">
              All Episodes
            </h2>
            <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
              No episodes yet. Create your first one above.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
