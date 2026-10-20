import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { citizenReportService } from "../services/citizenReportService"

type ReportStep = "form" | "submitted"

const steps = [
  { label: "Submitted", active: true },
  { label: "Under Review", active: false },
  { label: "Verified", active: false },
  { label: "Resolved", active: false },
]

const issueTypes = [
  "Work stopped without reason",
  "Poor material quality",
  "Progress slower than expected",
  "Safety hazards at site",
  "Suspected irregularities",
  "Contractor absent from site",
  "Other",
]

export default function CitizenReport() {
  const navigate = useNavigate()
  const [step, setStep] = useState<ReportStep>("form")
  const [generatedRef, setGeneratedRef] = useState<string>("RPT-2026-00847")
  const [form, setForm] = useState({
    projectId: "",
    issueType: "",
    description: "",
    location: "",
  })
  const [photoName, setPhotoName] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const report = citizenReportService.submitReport({
      projectId: form.projectId,
      issueType: form.issueType,
      description: form.description,
      location: form.location,
      photoName: photoName || undefined,
    })
    setGeneratedRef(report.referenceNo)
    setStep("submitted")
  }

  if (step === "submitted") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center mt-8 shadow-sm">
          <div className="w-16 h-16 bg-risk-low-bg rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl text-risk-low">✓</span>
          </div>
          <h2 className="font-display font-700 text-2xl text-navy-900 mb-2">Report Submitted Successfully</h2>
          <p className="text-slate-500 text-sm mb-2">Your report has been forwarded to the monitoring officers and assigned reference number:</p>
          <div className="font-mono font-700 text-navy-800 text-xl bg-navy-50 px-5 py-2.5 rounded-xl inline-block mb-6 border border-navy-100">
            {generatedRef}
          </div>
          <p className="text-slate-400 text-xs mb-8">
            Government Officers and Supervisors have been notified. You can track this report's real-time review status under "My Reports".
          </p>

          {/* Status tracker */}
          <div className="flex items-center justify-center gap-0 mb-8">
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-700 border-2 ${
                    i === 0
                      ? "bg-risk-low border-risk-low text-white"
                      : "bg-white border-slate-200 text-slate-300"
                  }`}>
                    {i === 0 ? "✓" : i + 1}
                  </div>
                  <div className={`text-[10px] mt-1.5 font-500 ${i === 0 ? "text-risk-low font-700" : "text-slate-400"}`}>
                    {s.label}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mb-4 ${i === 0 ? "bg-slate-300" : "bg-slate-100"}`}></div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate("/my-reports")}
              className="text-sm bg-navy-800 text-white px-6 py-2.5 rounded-xl font-600 hover:bg-navy-700 transition-colors shadow-sm"
            >
              Track in My Reports
            </button>
            <button
              onClick={() => {
                setForm({ projectId: "", issueType: "", description: "", location: "" })
                setPhotoName(null)
                setStep("form")
              }}
              className="text-sm bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl font-600 hover:bg-slate-200 transition-colors"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-700 text-2xl text-navy-900">Report a Project Issue</h1>
        <p className="text-slate-400 text-sm mt-1">
          Submit an issue or concern about a government project in your area. All reports are reviewed by the relevant authority.
        </p>
      </div>

      {/* Info box */}
      <div className="bg-accent-100 border border-accent-400/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <span className="text-xl">ℹ️</span>
        <div className="text-sm text-accent-700">
          <strong>This is an official reporting channel.</strong> Reports are reviewed by government officers.
          Please provide accurate information. False reports may have legal implications.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {/* Project ID */}
        <div>
          <label className="block text-sm font-600 text-slate-700 mb-1.5">
            Project ID <span className="text-risk-medium text-xs font-400 ml-1">(if known)</span>
          </label>
          <input
            type="text"
            value={form.projectId}
            onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}
            placeholder="e.g. DR-0001"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition-all font-mono"
          />
        </div>

        {/* Issue type */}
        <div>
          <label className="block text-sm font-600 text-slate-700 mb-1.5">
            Issue Type <span className="text-risk-high text-xs">*</span>
          </label>
          <select
            required
            value={form.issueType}
            onChange={e => setForm(p => ({ ...p, issueType: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition-all bg-white"
          >
            <option value="">Select an issue type</option>
            {issueTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-600 text-slate-700 mb-1.5">
            Description <span className="text-risk-high text-xs">*</span>
          </label>
          <textarea
            required
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Describe what you observed at the project site. Be as specific as possible about what you saw, when, and where."
            rows={4}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition-all resize-none"
          />
          <div className="text-right text-xs text-slate-300 mt-1">{form.description.length} / 500</div>
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-sm font-600 text-slate-700 mb-1.5">
            Photograph <span className="text-slate-400 text-xs font-400 ml-1">(optional but helpful)</span>
          </label>
          <label className="flex flex-col items-center gap-3 border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all">
            <span className="text-3xl">📷</span>
            <div className="text-center">
              <div className="text-sm font-500 text-slate-600">
                {photoName ? photoName : "Click to upload a photograph"}
              </div>
              <div className="text-xs text-slate-400 mt-1">JPG, PNG, HEIC · Max 10MB</div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => setPhotoName(e.target.files?.[0]?.name || null)}
            />
          </label>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-600 text-slate-700 mb-1.5">
            Location <span className="text-risk-high text-xs">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              placeholder="Village / Town, District, State"
              className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition-all"
            />
            <button
              type="button"
              className="px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              📍 Locate
            </button>
          </div>
        </div>

        {/* Privacy note */}
        <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
          🔒 Your personal information is not required to submit a report. If you choose to provide contact details, they will only be used to update you on the status of your report and will not be shared publicly.
        </div>

        <button
          type="submit"
          className="w-full bg-navy-800 text-white py-3.5 rounded-xl font-600 text-sm hover:bg-navy-700 transition-all hover:shadow-lg hover:shadow-navy-900/20"
        >
          Submit Report
        </button>
      </form>
    </div>
  )
}
