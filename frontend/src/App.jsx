import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import H2NotificationModal from "@/components/H2NotificationModal";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ReservasiPage from "@/pages/ReservasiPage";
import ArmadaPage from "@/pages/ArmadaPage";
import InvoiceKwitansiPage from "@/pages/InvoiceKwitansiPage";
import KlienPage from "@/pages/KlienPage";
import ProfilPage from "@/pages/ProfilPage";
import VerifyPage from "@/pages/VerifyPage";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";

function Layout({ children, user, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [h2List, setH2List] = useState([]);
  const [isH2ModalOpen, setIsH2ModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchH2Reminders = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.NOTIFICATIONS.H2_REMINDERS);
      if (res.success) {
        setH2List(res.data || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchH2Reminders();
    // Poll reminder every 5 minutes
    const interval = setInterval(fetchH2Reminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* H-2 In-App Alert Popup */}
      <H2NotificationModal
        isOpen={isH2ModalOpen}
        onClose={() => setIsH2ModalOpen(false)}
        upcomingList={h2List}
        onSelectOrder={(order) => {
          navigate("/reservasi");
        }}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          h2Count={h2List.length}
          onOpenH2Modal={() => setIsH2ModalOpen(true)}
          user={user}
          onLogout={onLogout}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ljc_user") || "null");
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(localStorage.getItem("ljc_token"));

  const handleLogout = () => {
    localStorage.removeItem("ljc_token");
    localStorage.removeItem("ljc_user");
    setUser(null);
    navigate("/login");
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#ffffff",
            color: "#1e293b",
            fontSize: "13px",
            fontWeight: "500",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid #f1f5f9",
          },
        }}
      />

      <Routes>
        {/* Public QR Verification Route (wildcard to allow codes with slashes like INV/LJC/...) */}
        <Route path="/verify/:type/*" element={<VerifyPage />} />

        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          }
        />

        {/* Protected App Routes */}
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Layout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/reservasi" element={<ReservasiPage />} />
                  <Route path="/armada" element={<ArmadaPage />} />
                  <Route path="/invoice-kwitansi" element={<InvoiceKwitansiPage />} />
                  <Route path="/klien" element={<KlienPage />} />
                  <Route path="/profil" element={<ProfilPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace state={{ from: location }} />
            )
          }
        />
      </Routes>
    </>
  );
}
