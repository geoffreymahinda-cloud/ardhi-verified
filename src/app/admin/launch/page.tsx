"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { loadDashboardState, saveDashboardState } from "./actions";

// ── COLOUR TOKENS ──────────────────────────────────────────────────────────
const C = {
  bg:"#0D1A0D", card:"#0F2010", border:"#1A3A1A",
  gold:"#C8902A", lgold:"#E8B84B", cream:"#F5EDD8",
  green:"#1A5C2A", lgreen:"#2D8A3E", leaf:"#60C870",
  teal:"#0A4A5A", navy:"#1A2A4A", amber:"#5A3A08",
  red:"#8A2A2A", muted:"#6B6B6B", white:"#FFFFFF",
  text:"#E8E0D0", soft:"#9A9080",
};

// ── INITIAL DATA ───────────────────────────────────────────────────────────
const PHASES = [
  { id:0, name:"Foundation",     weeks:"This Week",    color:"#5A3A08", badge:"Phase 0" },
  { id:1, name:"Seed Supply",    weeks:"Wks 3–5",      color:"#1A3A2A", badge:"Phase 1" },
  { id:2, name:"Soft Launch",    weeks:"Wks 6–8",      color:"#0A3A4A", badge:"Phase 2" },
  { id:3, name:"Community Push", weeks:"Wks 9–12",     color:"#2A1A4A", badge:"Phase 3" },
  { id:4, name:"Convert",        weeks:"Wks 13–18",    color:"#1A2A4A", badge:"Phase 4" },
  { id:5, name:"First Transaction",weeks:"Wks 19–24",  color:"#3A1A08", badge:"Phase 5" },
];

interface Task { id:string; phase:number; track:string; text:string; done:boolean; priority:string; }
interface Note { id:number; text:string; date:string; phase:number; }
interface KPIs { sacco_loi:number|string; agreements:number|string; listings:number|string; subscribers:number|string; eoi:number|string; instalment_buyers:number|string; deposits:number|string; transactions:number|string; valuation:string; }

const INITIAL_TASKS: Task[] = [
  { id:"t001", phase:0, track:"supply", text:"Email lawyer — status update on BRS, KIPI, SACCO template", done:false, priority:"high" },
  { id:"t002", phase:0, track:"supply", text:"Father briefs you on 1st SACCO conversation outcome", done:false, priority:"high" },
  { id:"t003", phase:0, track:"supply", text:"Prepare SACCO pitch deck — 8 slides max", done:false, priority:"high" },
  { id:"t004", phase:0, track:"demand", text:"Reinstall Google Workspace Business Starter — £4.60/month", done:false, priority:"high" },
  { id:"t005", phase:0, track:"demand", text:"Set up hello@ardhiverified.com as primary contact email", done:false, priority:"high" },
  { id:"t006", phase:0, track:"demand", text:"Add waitlist section to homepage — 'Be First to Know'", done:false, priority:"medium" },
  { id:"t007", phase:0, track:"demand", text:"Identify 5 Kenya diaspora WhatsApp groups to join this week", done:false, priority:"medium" },
  { id:"t008", phase:0, track:"trust", text:"File UK IPO trademark — gov.uk — £270 — 30 minutes", done:false, priority:"high" },
  { id:"t009", phase:0, track:"trust", text:"Draft and publish Privacy Policy at ardhiverified.com/privacy", done:false, priority:"high" },
  { id:"t010", phase:0, track:"trust", text:"Identify licensed escrow partner — LSK client account or bank", done:false, priority:"high" },
  { id:"t011", phase:1, track:"supply", text:"Father presents Ardhi Verified to Taifa SACCO leadership formally", done:false, priority:"high" },
  { id:"t012", phase:1, track:"supply", text:"Request SACCO Letter of Intent to list portfolio", done:false, priority:"high" },
  { id:"t013", phase:1, track:"supply", text:"Collect SACCO portfolio documentation — title deeds, survey maps", done:false, priority:"high" },
  { id:"t014", phase:1, track:"supply", text:"Begin manual NLIMS verification — target 10 titles in week 5", done:false, priority:"medium" },
  { id:"t015", phase:1, track:"demand", text:"Launch waitlist email campaign — 'First SACCO listings coming'", done:false, priority:"medium" },
  { id:"t016", phase:1, track:"demand", text:"Join 10 Kenya diaspora WhatsApp groups — introduce authentically", done:false, priority:"medium" },
  { id:"t017", phase:1, track:"demand", text:"Post first Facebook educational content — land verification guide", done:false, priority:"medium" },
  { id:"t018", phase:1, track:"demand", text:"Create Ardhi Verified LinkedIn company page", done:false, priority:"low" },
  { id:"t019", phase:1, track:"trust", text:"Escrow partner confirmed in writing", done:false, priority:"high" },
  { id:"t020", phase:1, track:"trust", text:"Instalment agreement template — first draft from lawyer", done:false, priority:"high" },
  { id:"t021", phase:1, track:"trust", text:"KIPI trademark application filed — confirmation received", done:false, priority:"high" },
  { id:"t022", phase:1, track:"trust", text:"Add escrow explainer page to website", done:false, priority:"medium" },
  { id:"t023", phase:2, track:"supply", text:"Publish first 5 verified listings on ardhiverified.com", done:false, priority:"high" },
  { id:"t024", phase:2, track:"supply", text:"Individual listing URLs live and tested — /listings/[slug]", done:false, priority:"high" },
  { id:"t025", phase:2, track:"supply", text:"SACCO partner badge visible on every listing", done:false, priority:"medium" },
  { id:"t026", phase:2, track:"demand", text:"Share listings in 3 WhatsApp groups personally", done:false, priority:"high" },
  { id:"t027", phase:2, track:"demand", text:"Send email to waitlist — 'First verified plots now live'", done:false, priority:"high" },
  { id:"t028", phase:2, track:"demand", text:"Post on LinkedIn — professional platform announcement", done:false, priority:"medium" },
  { id:"t029", phase:2, track:"demand", text:"Reach 200 email subscribers", done:false, priority:"medium" },
  { id:"t030", phase:2, track:"trust", text:"Expression of interest form fully tested", done:false, priority:"high" },
  { id:"t031", phase:2, track:"trust", text:"Stripe deposit payment page tested end to end", done:false, priority:"high" },
  { id:"t032", phase:2, track:"trust", text:"LSK advocate credentials page live on website", done:false, priority:"medium" },
  { id:"t033", phase:3, track:"supply", text:"First formal SACCO partnership agreement signed", done:false, priority:"high" },
  { id:"t034", phase:3, track:"supply", text:"Second SACCO initial conversation initiated by father", done:false, priority:"high" },
  { id:"t035", phase:3, track:"supply", text:"Total live listings: 25", done:false, priority:"medium" },
  { id:"t036", phase:3, track:"demand", text:"Attend first Kenya diaspora community event in London", done:false, priority:"high" },
  { id:"t037", phase:3, track:"demand", text:"Send monthly email newsletter — first Trust Report", done:false, priority:"medium" },
  { id:"t038", phase:3, track:"demand", text:"Reach 400 email subscribers", done:false, priority:"medium" },
  { id:"t039", phase:3, track:"demand", text:"Email Daily Nation journalist who wrote diaspora land fraud article", done:false, priority:"medium" },
  { id:"t040", phase:3, track:"trust", text:"FIRST DEPOSIT PAYMENT RECEIVED from instalment buyer", done:false, priority:"high" },
  { id:"t041", phase:3, track:"trust", text:"Instalment agreement signed with first committed buyer", done:false, priority:"high" },
  { id:"t042", phase:3, track:"trust", text:"Caution registered on first buyer's plot — LSK advocate files", done:false, priority:"high" },
  { id:"t043", phase:4, track:"supply", text:"Third SACCO partnership conversation initiated", done:false, priority:"high" },
  { id:"t044", phase:4, track:"supply", text:"Bank foreclosure tier — first formal approach to Kenya commercial bank", done:false, priority:"medium" },
  { id:"t045", phase:4, track:"supply", text:"Total live listings: 50+", done:false, priority:"medium" },
  { id:"t046", phase:4, track:"demand", text:"Activate USA diaspora — Kenya Association of America WhatsApp groups", done:false, priority:"high" },
  { id:"t047", phase:4, track:"demand", text:"Reach 750 email subscribers", done:false, priority:"medium" },
  { id:"t048", phase:4, track:"demand", text:"Send pitch to Daily Nation journalist", done:false, priority:"medium" },
  { id:"t049", phase:4, track:"demand", text:"First YouTube video published", done:false, priority:"medium" },
  { id:"t050", phase:4, track:"trust", text:"Third SACCO partnership agreement signed and executed", done:false, priority:"high" },
  { id:"t051", phase:4, track:"trust", text:"5 active instalment buyers — cautions registered for all", done:false, priority:"medium" },
  { id:"t052", phase:4, track:"trust", text:"Assurance Fund established — 10% of fees transferred monthly", done:false, priority:"medium" },
  { id:"t053", phase:5, track:"supply", text:"100+ verified plots on platform across 4–5 SACCO partners", done:false, priority:"high" },
  { id:"t054", phase:5, track:"demand", text:"Press release — 'Ardhi Verified completes first transaction'", done:false, priority:"high" },
  { id:"t055", phase:5, track:"trust", text:"TITLE DEED TRANSFERRED — buyer receives title in their name", done:false, priority:"high" },
  { id:"t056", phase:5, track:"trust", text:"Funds released from escrow — SACCO receives proceeds", done:false, priority:"high" },
  { id:"t057", phase:5, track:"trust", text:"First Ardhi Verified platform fee received — first revenue recognised", done:false, priority:"high" },
];

const INITIAL_KPIS: KPIs = {
  sacco_loi:0, agreements:0, listings:0, subscribers:0,
  eoi:0, instalment_buyers:0, deposits:0, transactions:0, valuation:"£250K"
};

const KPI_TARGETS = [
  { label:"SACCO LOIs",              p1:"1",   p2:"1–2", p3:"2",   p4:"3",   p5:"4–5"   },
  { label:"Agreements Signed",       p1:"0",   p2:"0–1", p3:"1",   p4:"2–3", p5:"4–5"   },
  { label:"Live Listings",           p1:"5",   p2:"10",  p3:"25",  p4:"50",  p5:"100+"  },
  { label:"Email Subscribers",       p1:"50",  p2:"200", p3:"400", p4:"750", p5:"1,500+"},
  { label:"Expressions of Interest", p1:"0",   p2:"10",  p3:"25",  p4:"50",  p5:"100+"  },
  { label:"Active Instalment Buyers",p1:"0",   p2:"0",   p3:"1",   p4:"5",   p5:"8–15"  },
  { label:"Deposits Received",       p1:"0",   p2:"0",   p3:"1",   p4:"3–5", p5:"8–15"  },
  { label:"Transactions Done",       p1:"0",   p2:"0",   p3:"0",   p4:"0",   p5:"1"     },
  { label:"Valuation (indicative)",  p1:"£350K",p2:"£500K",p3:"£700K",p4:"£1.2M",p5:"£1.5M+"},
];

const TRACK_CONFIG: Record<string,{label:string;sub:string;color:string;icon:string}> = {
  supply: { label:"SUPPLY", sub:"Partners & Listings", color:"#1A5C2A", icon:"🌱" },
  demand: { label:"DEMAND", sub:"Buyers & Community",  color:"#5A3A08", icon:"🌍" },
  trust:  { label:"TRUST",  sub:"Legal & Infrastructure",color:"#1A2A4A",icon:"🔐" },
};

type View = "board" | "kpis" | "phases" | "notes";

export default function LaunchDashboard() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [kpis, setKpis] = useState<KPIs>(INITIAL_KPIS);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activePhase, setActivePhase] = useState(0);
  const [activeTrack, setActiveTrack] = useState("all");
  const [view, setView] = useState<View>("board");
  const [editingKpi, setEditingKpi] = useState<string|null>(null);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const saveTimeout = useRef<NodeJS.Timeout|null>(null);

  // Load from Supabase on mount
  useEffect(() => {
    loadDashboardState().then((data) => {
      if (data) {
        if (data.tasks) setTasks(data.tasks as Task[]);
        if (data.kpis) setKpis(data.kpis as KPIs);
        if (data.notes) setNotes(data.notes as Note[]);
      }
      setLoading(false);
    }).catch(() => {
      setError("Admin access required. Please sign in.");
      setLoading(false);
    });
  }, []);

  // Auto-save to Supabase (debounced 1s)
  const autoSave = useCallback((t: Task[], k: KPIs, n: Note[]) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await saveDashboardState({ tasks: t, kpis: k, notes: n });
        setLastSaved(new Date().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }));
      } catch {
        // Silent fail on save — state is still in memory
      }
    }, 1000);
  }, []);

  const toggleTask = (id: string) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? {...t, done:!t.done} : t);
      autoSave(next, kpis, notes);
      return next;
    });
  };

  const updateKpi = (key: string, value: string|number) => {
    setKpis(prev => {
      const next = {...prev, [key]:value};
      autoSave(tasks, next, notes);
      return next;
    });
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes(prev => {
      const next = [{ id:Date.now(), text:newNote.trim(), date:new Date().toLocaleDateString("en-GB"), phase:activePhase }, ...prev];
      autoSave(tasks, kpis, next);
      return next;
    });
    setNewNote("");
  };

  const phaseTasks = (phaseId: number, track="all") =>
    tasks.filter(t => t.phase === phaseId && (track === "all" || t.track === track));

  const phaseProgress = (phaseId: number) => {
    const pts = tasks.filter(t => t.phase === phaseId);
    return pts.length ? Math.round(pts.filter(t=>t.done).length / pts.length * 100) : 0;
  };

  const overallProgress = () => Math.round(tasks.filter(t=>t.done).length / tasks.length * 100);

  const currentPhase = PHASES.reduce((acc, p) => {
    const progress = phaseProgress(p.id);
    if (progress > 0 && progress < 100) return p.id;
    if (progress === 100 && p.id >= acc) return p.id + 1;
    return acc;
  }, 0);

  if (loading) return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.soft}}>Loading dashboard...</div>;
  if (error) return <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.red,flexDirection:"column",gap:"12px"}}><p>{error}</p><a href="/auth/login" style={{color:C.gold}}>Sign in →</a></div>;

  const trackGroups = (["supply","demand","trust"] as const).map(track => ({
    track,
    tasks: phaseTasks(activePhase, track),
    config: TRACK_CONFIG[track],
  }));

  const filteredTasks = phaseTasks(activePhase, activeTrack);

  // Inline styles (preserved from original)
  const navBtn = (active: boolean) => ({ background:active?C.green:"transparent", color:active?C.white:C.soft, border:`1px solid ${active?C.lgreen:"#2A3A2A"}`, padding:"6px 16px", borderRadius:"20px", cursor:"pointer" as const, fontSize:"13px", fontWeight:active?"600":"400" as const, transition:"all 0.2s" });
  const phasePill = (active: boolean, color: string) => ({ background:active?color:"transparent", color:active?C.white:C.soft, border:`1px solid ${active?color:"#2A3A2A"}`, padding:"6px 14px", borderRadius:"20px", cursor:"pointer" as const, fontSize:"12px", fontWeight:"600" as const, whiteSpace:"nowrap" as const });
  const taskStyle = (done: boolean, priority: string) => ({ display:"flex", alignItems:"flex-start" as const, gap:"10px", padding:"10px 12px", background:done?"#0A1A0A":"#0F180F", borderRadius:"6px", marginBottom:"6px", border:`1px solid ${priority==="high"&&!done?"#3A2A0A":done?"#1A3A1A":"#1A2A1A"}`, opacity:done?0.5:1, cursor:"pointer" as const });
  const checkboxStyle = (done: boolean) => ({ width:"18px", height:"18px", borderRadius:"4px", flexShrink:0, marginTop:"1px", background:done?C.lgreen:"transparent", border:`2px solid ${done?C.lgreen:"#3A4A3A"}`, display:"flex", alignItems:"center" as const, justifyContent:"center" as const, fontSize:"11px" });

  return (
    <div style={{background:C.bg, minHeight:"100vh", fontFamily:"'Inter',sans-serif", color:C.text}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.card},#081208)`, borderBottom:`3px solid ${C.gold}`, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px"}}>
        <div>
          <div style={{fontFamily:"Georgia,serif", fontSize:"22px", fontWeight:"bold", color:C.lgold, letterSpacing:"0.06em"}}>ARDHI VERIFIED</div>
          <div style={{fontSize:"11px", color:C.soft, letterSpacing:"0.15em", textTransform:"uppercase" as const, marginTop:"2px", fontFamily:"'Courier New',monospace"}}>Launch Flywheel Dashboard · April–September 2026</div>
        </div>
        <div style={{textAlign:"right" as const}}>
          <div style={{fontSize:"12px",color:C.soft,marginBottom:"4px"}}>Overall Progress — {overallProgress()}% of all actions</div>
          <div style={{width:"180px",height:"8px",background:"#1A2A1A",borderRadius:"4px",overflow:"hidden"}}>
            <div style={{height:"100%",background:`linear-gradient(90deg,${C.gold},${C.lgold})`,borderRadius:"4px",width:`${overallProgress()}%`,transition:"width 0.4s"}} />
          </div>
          <div style={{fontSize:"11px",color:C.soft,marginTop:"4px"}}>
            {tasks.filter(t=>t.done).length} of {tasks.length} actions complete
            {lastSaved && <span style={{marginLeft:"12px",color:C.lgreen}}>Saved {lastSaved}</span>}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{background:"#090F09",padding:"8px 24px",display:"flex",gap:"8px",borderBottom:"1px solid #1A2A1A",flexWrap:"wrap"}}>
        {(["board","kpis","phases","notes"] as View[]).map(v => (
          <button key={v} style={navBtn(view===v)} onClick={()=>setView(v)}>
            {v==="board"?"📋 Task Board":v==="kpis"?"📊 KPI Tracker":v==="phases"?"🎯 Phase Overview":"📝 Notes"}
          </button>
        ))}
        <div style={{marginLeft:"auto",fontSize:"12px",color:C.soft,display:"flex",alignItems:"center",gap:"8px"}}>
          <span style={{width:"8px",height:"8px",borderRadius:"50%",background:C.lgreen,display:"inline-block"}}/>
          Active Phase: <strong style={{color:C.lgold}}>{PHASES[Math.min(currentPhase,5)]?.name}</strong>
        </div>
      </div>

      <div style={{padding:"20px 24px",maxWidth:"1400px",margin:"0 auto"}}>

        {/* ── BOARD VIEW ── */}
        {view === "board" && (
          <>
            <div style={{display:"flex",gap:"8px",marginBottom:"20px",flexWrap:"wrap"}}>
              {PHASES.map(p => (
                <button key={p.id} style={phasePill(activePhase===p.id, p.color)} onClick={()=>setActivePhase(p.id)}>
                  {p.badge}: {p.name} <span style={{marginLeft:"6px",opacity:0.7}}>{phaseProgress(p.id)}%</span>
                </button>
              ))}
            </div>

            <div style={{display:"flex",gap:"8px",marginBottom:"16px",flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:"12px",color:C.soft}}>Track:</span>
              {["all","supply","demand","trust"].map(t => (
                <button key={t} style={navBtn(activeTrack===t)} onClick={()=>setActiveTrack(t)}>
                  {t==="all"?"All Tracks":`${TRACK_CONFIG[t]?.icon} ${TRACK_CONFIG[t]?.label}`}
                </button>
              ))}
            </div>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"12px 16px",marginBottom:"16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                <span style={{fontSize:"13px",fontWeight:"600"}}>{PHASES[activePhase].name} — {PHASES[activePhase].weeks}</span>
                <span style={{fontSize:"13px",color:C.lgold,fontWeight:"700"}}>{phaseProgress(activePhase)}% complete</span>
              </div>
              <div style={{background:"#1A2A1A",borderRadius:"4px",height:"8px",overflow:"hidden"}}>
                <div style={{width:`${phaseProgress(activePhase)}%`,height:"100%",background:`linear-gradient(90deg,${C.gold},${C.lgold})`,borderRadius:"4px",transition:"width 0.4s"}} />
              </div>
            </div>

            {activeTrack === "all" ? (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"16px"}}>
                {trackGroups.map(({track,tasks:tt,config}) => (
                  <div key={track} style={{background:`${config.color}18`,border:`1px solid ${config.color}40`,borderRadius:"10px",overflow:"hidden"}}>
                    <div style={{background:`${config.color}30`,padding:"12px 16px",borderBottom:`1px solid ${config.color}30`}}>
                      <div style={{fontSize:"13px",fontWeight:"800",letterSpacing:"0.12em",color:config.color}}>{config.icon} {config.label}</div>
                      <div style={{fontSize:"11px",opacity:0.7,marginTop:"2px"}}>{config.sub}</div>
                      <div style={{fontSize:"11px",color:C.soft,marginTop:"4px"}}>{tt.filter(t=>t.done).length}/{tt.length} done</div>
                    </div>
                    <div style={{padding:"12px"}}>
                      {tt.length === 0 && <div style={{fontSize:"12px",color:C.soft,padding:"8px",textAlign:"center"}}>No tasks in this phase</div>}
                      {tt.map(task => (
                        <div key={task.id} style={taskStyle(task.done, task.priority)} onClick={()=>toggleTask(task.id)}>
                          <div style={checkboxStyle(task.done)}>{task.done?"✓":""}</div>
                          <div style={{width:"6px",height:"6px",borderRadius:"50%",flexShrink:0,marginTop:"6px",background:task.priority==="high"?C.lgold:task.priority==="medium"?"#4A8A5A":"#3A4A3A"}} />
                          <div style={{fontSize:"13px",lineHeight:"1.45",textDecoration:task.done?"line-through":"none",color:task.done?C.soft:C.text}}>{task.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {filteredTasks.map(task => (
                  <div key={task.id} style={{...taskStyle(task.done, task.priority), marginBottom:"8px"}} onClick={()=>toggleTask(task.id)}>
                    <div style={checkboxStyle(task.done)}>{task.done?"✓":""}</div>
                    <div style={{width:"6px",height:"6px",borderRadius:"50%",flexShrink:0,marginTop:"6px",background:task.priority==="high"?C.lgold:task.priority==="medium"?"#4A8A5A":"#3A4A3A"}} />
                    <div style={{fontSize:"13px",lineHeight:"1.45",textDecoration:task.done?"line-through":"none",color:task.done?C.soft:C.text}}>{task.text}</div>
                    <div style={{marginLeft:"auto",fontSize:"11px",color:C.soft,whiteSpace:"nowrap"}}>{TRACK_CONFIG[task.track]?.icon}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── KPI TRACKER ── */}
        {view === "kpis" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <h2 style={{fontSize:"18px",color:C.lgold,marginBottom:"4px",fontFamily:"Georgia,serif"}}>KPI Tracker</h2>
              <p style={{fontSize:"13px",color:C.soft}}>Click any card to edit. Auto-saves to Supabase.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"12px",marginBottom:"24px"}}>
              {[
                {key:"sacco_loi",label:"SACCO LOIs",icon:"🤝"},
                {key:"agreements",label:"Agreements Signed",icon:"📋"},
                {key:"listings",label:"Live Listings",icon:"🏡"},
                {key:"subscribers",label:"Email Subscribers",icon:"📧"},
                {key:"eoi",label:"Expressions of Interest",icon:"✋"},
                {key:"instalment_buyers",label:"Active Instalment Buyers",icon:"💳"},
                {key:"deposits",label:"Deposits Received",icon:"💰"},
                {key:"transactions",label:"Transactions Complete",icon:"🎯"},
                {key:"valuation",label:"Est. Valuation",icon:"📈"},
              ].map(kpi => (
                <div key={kpi.key} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"16px",cursor:"pointer"}} onClick={()=>setEditingKpi(kpi.key)}>
                  <div style={{fontSize:"11px",color:C.soft,letterSpacing:"0.08em",textTransform:"uppercase" as const,marginBottom:"8px"}}>{kpi.icon} {kpi.label}</div>
                  {editingKpi === kpi.key ? (
                    <input autoFocus style={{background:"#1A2A1A",border:`1px solid ${C.gold}`,borderRadius:"4px",padding:"4px 8px",color:C.lgold,fontSize:"22px",fontWeight:"800",width:"100%",outline:"none",fontFamily:"Georgia,serif"}}
                      value={(kpis as unknown as Record<string,string|number>)[kpi.key]}
                      onChange={e=>updateKpi(kpi.key, e.target.value)}
                      onBlur={()=>setEditingKpi(null)}
                      onKeyDown={e=>e.key==="Enter"&&setEditingKpi(null)}
                    />
                  ) : (
                    <div style={{fontSize:"28px",fontWeight:"800",color:C.lgold,fontFamily:"Georgia,serif"}}>{(kpis as unknown as Record<string,string|number>)[kpi.key]}</div>
                  )}
                  <div style={{display:"flex",gap:"4px",marginTop:"8px",flexWrap:"wrap"}}>
                    {["P1","P2","P3","P4","P5"].map((p,i) => {
                      const tgt = KPI_TARGETS.find(k=>k.label.toLowerCase().includes(kpi.label.toLowerCase().slice(0,6)))?.[`p${i+1}` as keyof typeof KPI_TARGETS[0]] || "—";
                      return <span key={p} style={{fontSize:"10px",padding:"2px 6px",borderRadius:"10px",background:"#1A2A1A",color:C.soft}}>{p}: {tgt}</span>;
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden"}}>
              <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,fontSize:"13px",fontWeight:"700",color:C.lgold}}>📊 Phase Targets Reference</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                  <thead>
                    <tr style={{background:"#1A2A1A"}}>
                      {["KPI","Phase 1","Phase 2","Phase 3","Phase 4","Phase 5"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left" as const,color:C.soft,fontWeight:"600",borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {KPI_TARGETS.map((row,i)=>(
                      <tr key={row.label} style={{background:i%2===0?"#0F180F":"#0A120A"}}>
                        {[row.label,row.p1,row.p2,row.p3,row.p4,row.p5].map((v,j)=>(
                          <td key={j} style={{padding:"9px 12px",borderBottom:"1px solid #1A2A1A",color:j===0?C.text:C.lgold,fontWeight:j===0?"400":"600"}}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── PHASE OVERVIEW ── */}
        {view === "phases" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <h2 style={{fontSize:"18px",color:C.lgold,marginBottom:"4px",fontFamily:"Georgia,serif"}}>Phase Overview</h2>
              <p style={{fontSize:"13px",color:C.soft}}>Click a phase to jump to its task board.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"12px",marginBottom:"24px"}}>
              {PHASES.map(p => {
                const pct = phaseProgress(p.id);
                const total = tasks.filter(t=>t.phase===p.id).length;
                const done = tasks.filter(t=>t.phase===p.id&&t.done).length;
                const high = tasks.filter(t=>t.phase===p.id&&t.priority==="high"&&!t.done).length;
                return (
                  <div key={p.id} style={{background:`${p.color}20`,border:`2px solid ${activePhase===p.id?p.color:`${p.color}40`}`,borderRadius:"10px",padding:"14px 16px",cursor:"pointer"}} onClick={()=>{setActivePhase(p.id);setView("board");}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:"13px",fontWeight:"700",color:p.color}}>{p.badge}</div>
                        <div style={{fontSize:"16px",fontWeight:"700",color:C.text,marginBottom:"2px"}}>{p.name}</div>
                        <div style={{fontSize:"11px",color:C.soft}}>{p.weeks}</div>
                      </div>
                      <div style={{fontSize:"24px",fontWeight:"800",color:pct===100?C.lgreen:C.lgold}}>{pct}%</div>
                    </div>
                    <div style={{background:"#1A2A1A",borderRadius:"4px",height:"6px",overflow:"hidden",marginTop:"10px"}}>
                      <div style={{width:`${pct}%`,height:"100%",background:p.color,borderRadius:"4px"}} />
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:"8px"}}>
                      <span style={{fontSize:"11px",color:C.soft}}>{done}/{total} tasks</span>
                      {high > 0 && <span style={{fontSize:"11px",color:C.lgold,fontWeight:"600"}}>⚡ {high} high priority</span>}
                      {pct===100 && <span style={{fontSize:"11px",color:C.lgreen,fontWeight:"600"}}>✓ Complete</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",flexWrap:"wrap",gap:"12px"}}>
                <div>
                  <div style={{fontSize:"16px",fontWeight:"700",color:C.lgold,fontFamily:"Georgia,serif"}}>Total Launch Progress</div>
                  <div style={{fontSize:"12px",color:C.soft,marginTop:"2px"}}>{tasks.filter(t=>t.done).length} of {tasks.length} actions</div>
                </div>
                <div style={{fontSize:"32px",fontWeight:"800",color:C.lgold,fontFamily:"Georgia,serif"}}>{overallProgress()}%</div>
              </div>
              <div style={{background:"#1A2A1A",borderRadius:"6px",height:"12px",overflow:"hidden"}}>
                <div style={{width:`${overallProgress()}%`,height:"100%",background:`linear-gradient(90deg,${C.gold},${C.lgold})`,borderRadius:"6px"}} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginTop:"16px"}}>
                {(["supply","demand","trust"] as const).map(track => {
                  const tTasks = tasks.filter(t=>t.track===track);
                  const tDone = tTasks.filter(t=>t.done).length;
                  const tPct = Math.round(tDone/tTasks.length*100);
                  const cfg = TRACK_CONFIG[track];
                  return (
                    <div key={track} style={{background:`${cfg.color}18`,border:`1px solid ${cfg.color}30`,borderRadius:"8px",padding:"12px"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:cfg.color,marginBottom:"6px"}}>{cfg.icon} {cfg.label}</div>
                      <div style={{fontSize:"20px",fontWeight:"800",color:C.text}}>{tPct}%</div>
                      <div style={{fontSize:"11px",color:C.soft}}>{tDone}/{tTasks.length} tasks</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── NOTES ── */}
        {view === "notes" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <h2 style={{fontSize:"18px",color:C.lgold,marginBottom:"4px",fontFamily:"Georgia,serif"}}>Launch Notes</h2>
              <p style={{fontSize:"13px",color:C.soft}}>Record decisions, blockers, wins. Auto-saves to Supabase.</p>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"16px"}}>
              <textarea
                style={{width:"100%",background:"#0A150A",border:`1px solid ${C.border}`,borderRadius:"6px",padding:"10px 12px",color:C.text,fontSize:"13px",resize:"none" as const,outline:"none",fontFamily:"inherit",boxSizing:"border-box" as const}}
                rows={3}
                placeholder="Add a note — SACCO conversation outcome, buyer feedback, blocker, win..."
                value={newNote}
                onChange={e=>setNewNote(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&e.ctrlKey&&addNote()}
              />
              <button style={{background:C.gold,color:"#0A0A04",border:"none",borderRadius:"6px",padding:"8px 20px",cursor:"pointer",fontWeight:"700",fontSize:"13px",marginTop:"8px"}} onClick={addNote}>Add Note</button>
            </div>
            <div style={{marginTop:"16px"}}>
              {notes.length === 0 && <div style={{fontSize:"13px",color:C.soft,textAlign:"center",padding:"24px"}}>No notes yet.</div>}
              {notes.map(note => (
                <div key={note.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`,fontSize:"13px"}}>
                  <div style={{fontSize:"11px",color:C.soft,marginBottom:"4px"}}>{note.date} · Phase {note.phase}: {PHASES[note.phase]?.name}</div>
                  <div style={{color:C.text,lineHeight:"1.5"}}>{note.text}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
