import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"

const MOCK_CONTRACTORS = [
  { id: "C-1047", name: "ABC Infrastructure Pvt. Ltd.", state: "Karnataka", class: "Class A", risk: 72, projects: 18, delayed: 5 },
  { id: "C-2099", name: "L&T Construction", state: "Multi-State", class: "Class A+", risk: 24, projects: 154, delayed: 12 },
  { id: "C-3301", name: "Sharma Civil Works", state: "Punjab", class: "Class B", risk: 85, projects: 7, delayed: 4 },
  { id: "C-4192", name: "Himalaya Roadways", state: "Himachal Pradesh", class: "Class B", risk: 45, projects: 12, delayed: 2 },
  { id: "C-5582", name: "MegaCorp Builders", state: "Multi-State", class: "Class A", risk: 60, projects: 45, delayed: 15 },
  { id: "C-6011", name: "Deccan Engineering", state: "Karnataka", class: "Class B", risk: 38, projects: 22, delayed: 3 },
]

export default function ContractorsList() {
  const navigate = useNavigate()
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy-900">Contractor Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and monitor contractor performance and risk profiles</p>
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="Search contractors..." className="border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-navy-500 w-64" />
          <button className="bg-navy-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-navy-800">Search</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_CONTRACTORS.map((c, i) => {
          const isHighRisk = c.risk >= 70
          const isMediumRisk = c.risk >= 50 && c.risk < 70
          return (
            <div
              key={c.id}
              className={`bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-navy-300 transition-all cursor-pointer ${
                animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${i * 50}ms` }}
              onClick={() => navigate(`/contractor/${c.id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs font-mono text-slate-400 mb-1">{c.id}</div>
                  <h3 className="font-display font-bold text-navy-900 text-lg leading-tight">{c.name}</h3>
                </div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 font-bold ${
                  isHighRisk ? "bg-red-50 text-red-600 border border-red-200" :
                  isMediumRisk ? "bg-amber-50 text-amber-600 border border-amber-200" :
                  "bg-green-50 text-green-600 border border-green-200"
                }`}>
                  {c.risk}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-medium">{c.state}</span>
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-medium">{c.class}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Total Projects</div>
                  <div className="font-mono text-lg font-bold text-navy-800">{c.projects}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Delayed</div>
                  <div className={`font-mono text-lg font-bold ${c.delayed > 5 ? "text-red-500" : "text-navy-800"}`}>{c.delayed}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
