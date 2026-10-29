import React, { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { citizenReportService } from "../services/citizenReportService"
import {
  FileTextIcon,
  CheckIcon,
  CheckCircleIcon,
  MapPinIcon,
  CameraIcon,
  ShieldIcon,
  ShieldCheckIcon,
  UserIcon,
  PlusIcon,
  ArrowRightIcon,
  InfoIcon,
  SpinnerIcon,
} from "../components/GrievanceIcons"

type ReportStep = "form" | "submitted"

const STEPS = [
  { label: "Submitted" },
  { label: "Under Review" },
  { label: "Verified" },
  { label: "Resolved" },
]

const ISSUE_TYPES = [
  "Work stopped without reason",
  "Poor material quality",
  "Progress slower than expected",
  "Safety hazards at site",
  "Suspected irregularities",
  "Contractor absent from site",
  "Environmental or drainage hazard",
  "Other non-compliance",
]

export default function CitizenReport() {
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()
  const location = useLocation()

  const [step, setStep] = useState<ReportStep>("form")
  const [generatedRef, setGeneratedRef] = useState<string>("RPT-2026-00847")
  const [form, setForm] = useState({
    projectId: "",
    issueType: "",
    description: "",
    location: "",
  })
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locateStatus, setLocateStatus] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // Restore saved form draft if returning after login
  useEffect(() => {
    const draft = sessionStorage.getItem("drishti_pending_report")
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        setForm(parsed.form || form)
        if (parsed.photoName) setPhotoName(parsed.photoName)
        sessionStorage.removeItem("drishti_pending_report")
      } catch (e) {
        // ignore draft parsing errors
      }
    }
  }, [])

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocateStatus("Geolocation is not supported by your browser.")
      return
    }

    setIsLocating(true)
    setLocateStatus(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { headers: { "Accept-Language": "en" } }
          )
          if (res.ok) {
            const data = await res.json()
            const a = data.address || {}
            const neighborhood = a.suburb || a.neighbourhood || a.residential || a.road || ""
            const cityOrTown = a.city || a.town || a.village || a.county || a.state_district || ""
            const state = a.state || ""
            const parts = [neighborhood, cityOrTown, state].filter(Boolean)
            const locStr = parts.length > 0 ? parts.join(", ") : (data.display_name?.split(",").slice(0, 3).join(",") || "")
            setForm((p) => ({
              ...p,
              location: locStr ? `${locStr} (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})` : `GPS: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`
            }))
            setLocateStatus("Location coordinates successfully identified.")
          } else {
            setForm((p) => ({ ...p, location: `GPS: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E` }))
            setLocateStatus("GPS coordinates recorded.")
          }
        } catch {
          setForm((p) => ({ ...p, location: `GPS: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E` }))
          setLocateStatus("GPS coordinates recorded.")
        } finally {
          setIsLocating(false)
          setTimeout(() => setLocateStatus(null), 4000)
        }
      },
      () => {
        setIsLocating(false)
        if (user?.district || user?.state) {
          const fallback = [user.district, user.state].filter(Boolean).join(", ")
          setForm((p) => ({ ...p, location: fallback }))
          setLocateStatus(`Using registered profile location (${fallback}).`)
        } else {
          setLocateStatus("Location access blocked. Please enter location manually.")
        }
        setTimeout(() => setLocateStatus(null), 4500)
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const citizenContact = user
      ? `${user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username} (${user.email || 'Citizen'})`
      : "Guest Citizen (Public Whistleblower)"

    const report = citizenReportService.submitReport({
      projectId: form.projectId,
      issueType: form.issueType,
      description: form.description,
      location: form.location,
      photoName: photoName || undefined,
      citizenContact,
    })
    setGeneratedRef(report.referenceNo)
    setStep("submitted")
  }

  const handleCopyRef = () => {
    navigator.clipboard.writeText(generatedRef)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2500)
  }

  // --- SUBMITTED CONFIRMATION VIEW ---
  if (step === "submitted") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center mt-6 shadow-sm">
          {/* Success Checkmark */}
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-600 shadow-xs">
            <CheckIcon size={26} />
          </div>

          <h2 className="font-display font-bold text-2xl text-slate-900 mb-2 tracking-tight">
            Grievance Registered Successfully
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-4 leading-relaxed">
            Your observation has been indexed into the Central Public Monitoring registry under reference ID:
          </p>

          {/* Reference Number Badge with Copy */}
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl mb-6 shadow-2xs">
            <span className="font-mono font-bold text-slate-900 text-base sm:text-lg">
              {generatedRef}
            </span>
            <button
              onClick={handleCopyRef}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 px-2 py-0.5 rounded transition cursor-pointer"
              title="Copy reference number"
            >
              {isCopied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* 4-Step Linear Pipeline */}
          <div className="max-w-md mx-auto mb-8 py-3 px-4 bg-slate-50/70 border border-slate-200/70 rounded-xl">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left mb-3">
              Redressal Lifecycle Tracker
            </div>
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => (
                <div key={s.label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition ${
                        i === 0
                          ? "bg-blue-900 border-blue-900 text-white shadow-xs"
                          : "bg-white border-slate-300 text-slate-400"
                      }`}
                    >
                      {i === 0 ? <CheckIcon size={13} /> : i + 1}
                    </div>
                    <span
                      className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
                        i === 0 ? "text-blue-950 font-bold" : "text-slate-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mb-4 mx-2 ${
                        i === 0 ? "bg-slate-300" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-500 text-xs max-w-lg mx-auto mb-6 leading-relaxed">
            The assigned regional oversight authority has been alerted. You can review verification notes and track progress anytime under <strong>My Reports</strong>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate("/my-reports")}
              className="inline-flex items-center gap-2 bg-[#0b1f4b] hover:bg-[#122e6e] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <span>Track in My Reports</span>
              <ArrowRightIcon size={14} />
            </button>
            <button
              onClick={() => {
                setForm({ projectId: "", issueType: "", description: "", location: "" })
                setPhotoName(null)
                setStep("form")
              }}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <PlusIcon size={14} />
              <span>Submit Another Report</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- SUBMISSION FORM VIEW ---
  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold tracking-wide uppercase mb-2">
          <ShieldCheckIcon size={13} className="text-slate-600" />
          <span>Public Infrastructure Grievance Portal</span>
        </div>
        <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
          Report a Project Issue
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-relaxed">
          Submit verified observations, delays, safety hazards, or quality irregularities on public infrastructure works.
        </p>
      </div>

      {/* Guest Warning Banner */}
      {isGuest && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900 shrink-0 mt-0.5">
              <UserIcon size={16} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Browsing in Public Transparency Mode
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Guest Session
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                You may submit this report as a public whistleblower. Signing in attaches your verified identity so you receive direct notification when inspections conclude.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem("drishti_pending_report", JSON.stringify({ form, photoName }))
                    navigate("/login?tab=citizen&redirect=/report")
                  }}
                  className="bg-[#0b1f4b] hover:bg-[#122e6e] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition cursor-pointer"
                >
                  Citizen Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem("drishti_pending_report", JSON.stringify({ form, photoName }))
                    navigate("/login?tab=citizen&sub=register&redirect=/report")
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verified Citizen Badge */}
      {!isGuest && (
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 mb-6 flex items-center justify-between gap-3 text-xs text-blue-950">
          <div className="flex items-center gap-2.5">
            <UserIcon size={16} className="text-blue-800" />
            <span>
              Submitting as: <strong>{user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}</strong> ({user?.email})
            </span>
          </div>
          <span className="bg-blue-100/90 text-blue-900 font-mono font-bold text-[10px] px-2.5 py-0.5 rounded border border-blue-200">
            CITIZEN VERIFIED
          </span>
        </div>
      )}

      {/* Statutory Guidance Callout */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <InfoIcon size={18} className="text-slate-500 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-800">Statutory Notice:</strong> Reports submitted through this channel are logged under the Central Vigilance Guidelines. Please verify site observations to ensure accuracy.
        </div>
      </div>

      {/* Main Reporting Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 space-y-5 shadow-xs">
        {/* Project ID */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            Project Identifier <span className="text-slate-400 font-normal lowercase">(optional if known)</span>
          </label>
          <input
            type="text"
            value={form.projectId}
            onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))}
            placeholder="e.g. DR-0012 or NH-48 Expansion"
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0b1f4b] focus:ring-1 focus:ring-[#0b1f4b] transition font-mono"
          />
        </div>

        {/* Issue Type */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            Classification of Issue <span className="text-rose-600 font-bold">*</span>
          </label>
          <select
            required
            value={form.issueType}
            onChange={(e) => setForm((p) => ({ ...p, issueType: e.target.value }))}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 outline-none focus:border-[#0b1f4b] focus:ring-1 focus:ring-[#0b1f4b] transition bg-white cursor-pointer"
          >
            <option value="">Select issue category</option>
            {ISSUE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Location with Geo Locate Button */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            Incident Location <span className="text-rose-600 font-bold">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="Village / Town, District, State"
              className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0b1f4b] focus:ring-1 focus:ring-[#0b1f4b] transition"
            />
            <button
              type="button"
              onClick={handleLocate}
              disabled={isLocating}
              title="Detect current GPS location"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-60"
            >
              {isLocating ? <SpinnerIcon size={14} /> : <MapPinIcon size={14} className="text-slate-600" />}
              <span>{isLocating ? "Locating..." : "Locate"}</span>
            </button>
          </div>
          {locateStatus && (
            <div className={`mt-2 text-xs font-medium ${locateStatus.includes("blocked") ? "text-amber-700" : "text-emerald-700"}`}>
              {locateStatus}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            Detailed Site Observation <span className="text-rose-600 font-bold">*</span>
          </label>
          <textarea
            required
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Describe what was observed at the project site. Include specifics such as duration of halt, machinery condition, structural defects, or missing personnel."
            rows={4}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#0b1f4b] focus:ring-1 focus:ring-[#0b1f4b] transition resize-none"
          />
          <div className="text-right text-[11px] text-slate-400 mt-1">
            {form.description.length} / 500 characters
          </div>
        </div>

        {/* Photographic Evidence Attachment */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            Photographic Evidence <span className="text-slate-400 font-normal lowercase">(optional but recommended)</span>
          </label>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50 rounded-xl p-5 cursor-pointer transition">
            <CameraIcon size={24} className="text-slate-500" />
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-700">
                {photoName ? photoName : "Upload site photograph"}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                PNG, JPG, or PDF up to 10MB
              </p>
            </div>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setPhotoName(e.target.files?.[0]?.name || null)}
            />
          </label>
        </div>

        {/* Confidentiality Commitment */}
        <div className="bg-slate-50 rounded-xl p-3.5 text-[11px] text-slate-500 leading-relaxed border border-slate-200/80 flex items-start gap-2.5">
          <ShieldIcon size={16} className="text-slate-500 shrink-0 mt-0.5" />
          <span>
            Personal contact details remain confidential. Grievance data is encrypted and transferred solely to regional monitoring and quality inspection officers.
          </span>
        </div>

        {/* Form Submission Button */}
        <button
          type="submit"
          className="w-full bg-[#0b1f4b] hover:bg-[#122e6e] text-white py-3 rounded-xl font-semibold text-xs sm:text-sm transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Submit Grievance Report</span>
          <ArrowRightIcon size={14} />
        </button>
      </form>
    </div>
  )
}
