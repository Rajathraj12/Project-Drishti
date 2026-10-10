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
import Admin from "./pages/Admin"
import AppShell from "./layouts/AppShell"
import ProjectsList from "./pages/ProjectsList"
import WhyFlagged from "./pages/WhyFlagged"
import RiskAnalysis from "./pages/RiskAnalysis"
import Actions from "./pages/Actions"
import Reports from "./pages/Reports"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectsList />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />
          <Route path="/projects/:id/why-flagged" element={<WhyFlagged />} />
          <Route path="/risk-analysis" element={<RiskAnalysis />} />
          <Route path="/actions" element={<Actions />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/project-map" element={<Navigate to="/map" replace />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/inspections" element={<Inspections />} />
          <Route path="/contractors/:id" element={<ContractorProfile />} />
          <Route path="/report" element={<CitizenReport />} />
          <Route path="/citizen-portal" element={<Navigate to="/report" replace />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

