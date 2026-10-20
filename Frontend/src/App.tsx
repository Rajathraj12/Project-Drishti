import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import MapView from "./pages/MapView"
import ProjectDetails from "./pages/ProjectDetails"
import Evidence from "./pages/Evidence"
import Inspections from "./pages/Inspections"
import ContractorProfile from "./pages/ContractorProfile"
import CitizenReport from "./pages/CitizenReport"
import MyReports from "./pages/MyReports"
import Admin from "./pages/Admin"
import AppShell from "./layouts/AppShell"
import ProjectsList from "./pages/ProjectsList"
import ContractorsList from "./pages/ContractorsList"
import Actions from "./pages/Actions"
import Reports from "./pages/Reports"
import { AuthProvider } from "./contexts/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectsList />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/actions" element={<Actions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/project-map" element={<Navigate to="/map" replace />} />
            <Route path="/evidence" element={<Evidence />} />
            <Route path="/inspections" element={<Inspections />} />
            <Route path="/contractors" element={<ContractorsList />} />
            <Route path="/contractors/:id" element={<ContractorProfile />} />
            <Route path="/contractor/:id" element={<ContractorProfile />} />
            <Route path="/report" element={<CitizenReport />} />
            <Route path="/my-reports" element={<MyReports />} />
            <Route path="/citizen-portal" element={<Navigate to="/report" replace />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </BrowserRouter>
    </AuthProvider>
  )
}

