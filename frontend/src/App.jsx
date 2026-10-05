import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { VisitPage } from "./pages/VisitPage";
import { StockPage } from "./pages/StockPage";
import { HistoryPage } from "./pages/HistoryPage";
import { DayReportPage } from "./pages/DayReportPage";
import { ReceptionHistoryPage } from "./pages/ReceptionHistoryPage";
import { AllPatients } from "./pages/AllPatients";

export default function App() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <div className={tw.boot}>Loading…</div>;
  }
  if (!user) {
    return <LoginPage />;
  }

  const desk = user.role === "receptionist";
  const doctor = user.role === "doctor";

  return (
    <Layout>
      <Routes>
        {desk ? (
          <>
            <Route path="/" element={<VisitPage />} />
            <Route path="/patients" element={<AllPatients />} />
            <Route path="/history" element={<ReceptionHistoryPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : null}
        {doctor ? (
          <>
            <Route path="/" element={<HistoryPage />} />
            <Route path="/patients" element={<AllPatients />} />
            <Route path="/day" element={<DayReportPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : null}
      </Routes>
    </Layout>
  );
}

const tw = {
  boot: "min-h-screen flex items-center justify-center text-ink-soft text-lg font-semibold",
};
