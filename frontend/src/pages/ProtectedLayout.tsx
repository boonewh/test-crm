import { Outlet, Navigate } from "react-router-dom";

// For now, fake a login check
const isLoggedIn = true; // Later we'll replace with real auth check

export default function ProtectedLayout() {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex">
      {/* Sidebar, Header, or anything common to all pages can go here later */}
      <Outlet /> {/* This is where the child pages (Dashboard, Customers, etc.) render */}
    </div>
  );
}
