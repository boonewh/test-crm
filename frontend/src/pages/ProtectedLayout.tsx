import { Outlet, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/authContext";
import { useState, useEffect, useRef } from "react";
import SidebarNav from "@/components/SidebarNav";
import { apiFetch } from "@/lib/api";

export default function ProtectedLayout() {
  const { isAuthenticated, logout, token } = useAuth();

  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCollapsed(false);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (search.trim().length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      apiFetch(`/search/?q=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setResults(data);
          setShowResults(true);
        });
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, token]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, []);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (collapsed === null) return null;

  return (
    <div className="flex min-h-screen bg-muted">
      {/* Sidebar (desktop + mobile) */}
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        className={`
          fixed top-0 left-0 h-screen overflow-y-auto scrollbar-hide bg-white shadow z-40 transition-all duration-300
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${collapsed ? "lg:w-20" : "lg:w-64"} 
          w-64
        `}
      >
        <SidebarNav
          collapsed={collapsed}
          toggleCollapsed={() => setCollapsed((prev) => !prev)}
          isMobileOpen={isMobileOpen}
          closeMobile={() => setIsMobileOpen(false)}
        />
      </div>

      {/* Main content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          collapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <header className="flex justify-between items-center bg-primary text-primary-foreground px-6 py-4 shadow-sm gap-4 flex-wrap relative">
          <button
            className="lg:hidden text-primary-foreground hover:opacity-80"
            onClick={() => setIsMobileOpen(true)}
          >
            ☰
          </button>

          <span className="text-lg font-bold tracking-tight whitespace-nowrap">
            PathSix CRM
          </span>

          <div className="relative w-full max-w-sm flex-1" ref={searchRef}>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-white/30 bg-primary-foreground text-primary px-3 py-1 rounded-md text-sm placeholder:text-primary/60 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {showResults && results.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-64 overflow-y-auto text-sm">
                {Object.entries(
                  results.reduce((acc: Record<string, any[]>, r) => {
                    acc[r.type] = acc[r.type] || [];
                    acc[r.type].push(r);
                    return acc;
                  }, {})
                ).map(([type, entries]) => (
                  <div key={type}>
                    <div className="px-4 py-2 font-semibold text-gray-500 uppercase text-xs border-b bg-gray-50">
                      {type}s
                    </div>
                    {entries.map((r) =>
                      r.link ? (
                        <Link
                          key={`${r.type}-${r.id}`}
                          to={r.link}
                          className="block px-4 py-2 hover:bg-gray-100 text-gray-800"
                          onClick={() => setShowResults(false)}
                        >
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-gray-500">
                            Matched on: {r.matches.join(", ")}
                          </div>
                        </Link>
                      ) : (
                        <div
                          key={`${r.type}-${r.id}`}
                          className="block px-4 py-2 text-gray-400 cursor-not-allowed"
                        >
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-gray-400">
                            Matched on: {r.matches.join(", ")}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className="bg-accent text-accent-foreground hover:bg-accent/80 px-4 py-2 rounded-md text-sm transition-colors whitespace-nowrap"
          >
            Logout
          </button>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
