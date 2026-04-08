"use client";

import { useState, useEffect } from "react";

const C = {
  bg: "#0D1A0D", card: "#0F2010", border: "#1A3A1A",
  gold: "#C8902A", lgold: "#E8B84B", cream: "#F5EDD8",
  green: "#1A5C2A", lgreen: "#2D8A3E", leaf: "#60C870",
  teal: "#0A4A5A", navy: "#1A2A4A", amber: "#5A3A08",
  red: "#8A2A2A", muted: "#6B6B6B", white: "#FFFFFF",
  text: "#E8E0D0", soft: "#9A9080", purple: "#3A1A5A",
};

const PHASES = [
  { id:0, name:"Foundation",     weeks:"This Week",  color:"#5A3A08", badge:"Phase 0" },
  { id:1, name:"Seed Supply",    weeks:"Wks 3–5",    color:"#1A3A2A", badge:"Phase 1" },
  { id:2, name:"Soft Launch",    weeks:"Wks 6–8",    color:"#0A3A4A", badge:"Phase 2" },
  { id:3, name:"Community Push", weeks:"Wks 9–12",   color:"#2A1A4A", badge:"Phase 3" },
  { id:4, name:"Convert",        weeks:"Wks 13–18",  color:"#1A2A4A", badge:"Phase 4" },
  { id:5, name:"First Transaction",weeks:"Wks 19–24",color:"#3A1A08", badge:"Phase 5" },
];

const INITIAL_TASKS = [
  { id:"t001", phase:0, track:"supply",  text:"Email lawyer — BRS, KIPI, SACCO template status", done:false, priority:"high" },
  { id:"t002", phase:0, track:"supply",  text:"Father briefs you on 1st SACCO conversation outcome", done:false, priority:"high" },
  { id:"t003", phase:0, track:"supply",  text:"Prepare SACCO pitch deck — 8 slides max", done:false, priority:"high" },
  { id:"t004", phase:0, track:"demand",  text:"Set up hello@ardhiverified.com Google Workspace", done:false, priority:"high" },
  { id:"t005", phase:0, track:"demand",  text:"UK bank account — apply Starling once name change confirmed", done:false, priority:"high" },
  { id:"t006", phase:0, track:"demand",  text:"Kenya Co-op Bank account — brother to initiate after BRS", done:false, priority:"high" },
  { id:"t007", phase:0, track:"trust",   text:"SEIS advance assurance application — submit to HMRC", done:false, priority:"high" },
  { id:"t008", phase:0, track:"trust",   text:"Companies House name change confirmed — insert into SEIS doc", done:false, priority:"high" },
  { id:"t009", phase:1, track:"supply",  text:"Taifa SACCO meeting — present SACCO partnership proposal", done:false, priority:"high" },
  { id:"t010", phase:1, track:"supply",  text:"Stripe payment webhook + Full Report email — Claude Code build", done:false, priority:"high" },
  { id:"t011", phase:1, track:"supply",  text:"Individual listing pages with slugs — Claude Code build", done:false, priority:"high" },
  { id:"t012", phase:1, track:"supply",  text:"Instalment calculator live on each listing page", done:false, priority:"high" },
  { id:"t013", phase:1, track:"supply",  text:"Daraja Paybill webhook — M-Pesa payment → Supabase update", done:false, priority:"medium" },
  { id:"t014", phase:1, track:"demand",  text:"Join 5 Kenya diaspora WhatsApp groups in UK", done:false, priority:"medium" },
  { id:"t015", phase:1, track:"demand",  text:"Publish blog post: Registry Index Map article", done:true, priority:"high" },
  { id:"t016", phase:1, track:"trust",   text:"gazette_parcel_conversions table — Claude Code build", done:false, priority:"high" },
  { id:"t017", phase:1, track:"trust",   text:"RIM verification Supabase schema — Claude Code build", done:false, priority:"medium" },
  { id:"t018", phase:2, track:"supply",  text:"Second SACCO partner meeting (Biashara or Fortune)", done:false, priority:"medium" },
  { id:"t019", phase:2, track:"supply",  text:"Buyer dashboard — progress bar, payment history, docs", done:false, priority:"high" },
  { id:"t020", phase:2, track:"demand",  text:"First YouTube video published — RIM script", done:false, priority:"high" },
  { id:"t021", phase:2, track:"demand",  text:"LinkedIn founder story post published", done:false, priority:"medium" },
  { id:"t022", phase:2, track:"trust",   text:"5-checkpoint verification badge component — Claude Code", done:false, priority:"medium" },
  { id:"t023", phase:3, track:"supply",  text:"Third SACCO partner LOI signed", done:false, priority:"high" },
  { id:"t024", phase:3, track:"demand",  text:"BBC Africa / Daily Nation press pitch sent", done:false, priority:"medium" },
  { id:"t025", phase:3, track:"trust",   text:"47-county collector network — pilot 5 counties", done:false, priority:"medium" },
  { id:"t026", phase:4, track:"supply",  text:"First instalment buyer completes KYC", done:false, priority:"high" },
  { id:"t027", phase:4, track:"trust",   text:"First caution registered on buyer's behalf", done:false, priority:"high" },
  { id:"t028", phase:5, track:"supply",  text:"FIRST TRANSACTION COMPLETED — title transfer initiated", done:false, priority:"high" },
];

const INITIAL_KPIS = [
  { id:"k1", label:"SACCO LOIs Signed",      value:"0", target:"3",  unit:"",   phase:"Phase 1–3" },
  { id:"k2", label:"Live Listings",           value:"0", target:"20", unit:"",   phase:"Phase 2" },
  { id:"k3", label:"Email Subscribers",       value:"0", target:"500",unit:"",   phase:"Phase 3" },
  { id:"k4", label:"HatiScan Paid Scans",     value:"0", target:"50", unit:"",   phase:"Phase 2" },
  { id:"k5", label:"Active Instalment Buyers",value:"0", target:"5",  unit:"",   phase:"Phase 4" },
  { id:"k6", label:"Transactions Complete",   value:"0", target:"1",  unit:"",   phase:"Phase 5" },
  { id:"k7", label:"Monthly Revenue (£)",     value:"0", target:"1000",unit:"£", phase:"Phase 4" },
  { id:"k8", label:"Platform Valuation (£k)", value:"550",target:"900",unit:"£k",phase:"Live" },
];

const INITIAL_CONTENT = [
  { id:"c001", type:"blog", status:"published", title:"The Map That Stops Land Fraud — And Why Sellers Don't Want You to Know", platform:"ardhiverified.com/blog", notes:"Published. Live on the platform.", publishDate:"2026-04-08", link:"/blog/the-map-that-stops-land-fraud" },
  { id:"c002", type:"video", status:"ready", title:"The Map That Stops Land Fraud in Kenya (YouTube Long Form 8–10 min)", platform:"YouTube", notes:"Full script written. Hook, education, platform section, CTA. Ready to film.", publishDate:"", link:"" },
  { id:"c003", type:"video", status:"ready", title:"Ask This Question Before Buying Land in Kenya (60-second Short)", platform:"YouTube Shorts / Instagram Reels / TikTok", notes:"60-second script written. High-impact hook. Ready to film.", publishDate:"", link:"" },
  { id:"c004", type:"video", status:"ready", title:"Why I Built Ardhi Verified — Founder Story (3 min)", platform:"LinkedIn / YouTube", notes:"Personal founder story script. Ministry background, diaspora lived experience.", publishDate:"", link:"" },
  { id:"c005", type:"social", status:"ready", title:"Twitter/X Thread — 8 tweets on RIM and land fraud", platform:"Twitter / X", notes:"Full 8-tweet thread written. Starts with hook, ends with CTA to HatiScan.", publishDate:"", link:"" },
  { id:"c006", type:"social", status:"ready", title:"LinkedIn Long-Form Post — Government insider perspective", platform:"LinkedIn", notes:"Uses your Ministry of Planning background as authority. Strong professional angle.", publishDate:"", link:"" },
  { id:"c007", type:"social", status:"ready", title:"WhatsApp Broadcast Message — RIM verification", platform:"WhatsApp", notes:"Clean, non-salesy message for diaspora community groups. Share freely.", publishDate:"", link:"" },
  { id:"c008", type:"social", status:"ready", title:"Instagram Caption — RIM infographic post", platform:"Instagram", notes:"Caption written. Needs an infographic graphic created to accompany it.", publishDate:"", link:"" },
  { id:"c009", type:"blog", status:"planned", title:"What Is a Mutation Form? (And Why It Costs KES 300)", platform:"ardhiverified.com/blog", notes:"Follow-up article. Deep dive on mutation forms, how to check, what they mean.", publishDate:"", link:"" },
  { id:"c010", type:"blog", status:"planned", title:"The Five Questions to Ask Before Buying Land in Kenya", platform:"ardhiverified.com/blog", notes:"SEO-friendly educational post. Targets diaspora buyer research intent.", publishDate:"", link:"" },
  { id:"c011", type:"video", status:"planned", title:"What Is a SACCO? Why Ardhi Verified Partners Only With Institutions", platform:"YouTube", notes:"Explains SACCO model. Builds trust for diaspora buyers unfamiliar with SACCOs.", publishDate:"", link:"" },
  { id:"c012", type:"social", status:"planned", title:"First transaction announcement post", platform:"All platforms", notes:"Draft when first transaction completes. Proof of concept. Maximum impact post.", publishDate:"", link:"" },
];

const TRACK_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  supply: { label:"Supply", icon:"\u{1F3E1}", color:C.lgreen },
  demand: { label:"Demand", icon:"\u{1F4E3}", color:C.gold },
  trust:  { label:"Trust",  icon:"\u{1F510}", color:"#6A8ACA" },
};

const CONTENT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  blog:   { label:"Blog Post", icon:"\u270D\uFE0F",  color:C.teal },
  video:  { label:"Video",     icon:"\u{1F3AC}",  color:C.red },
  social: { label:"Social",    icon:"\u{1F4F1}",  color:C.purple },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  ready:     { label:"Ready to Publish", color:C.lgreen, dot:"\u{1F7E2}" },
  planned:   { label:"Planned",          color:C.amber,  dot:"\u{1F7E1}" },
  published: { label:"Published",        color:C.gold,   dot:"\u2705" },
};

interface Task { id: string; phase: number; track: string; text: string; done: boolean; priority: string; }
interface Kpi { id: string; label: string; value: string; target: string; unit: string; phase: string; }
interface ContentItem { id: string; type: string; status: string; title: string; platform: string; notes: string; publishDate: string; link: string; }
interface Note { id: number; text: string; date: string; phase: number; }

export default function LaunchDashboard() {
  const [view, setView] = useState("tasks");
  const [tasks, setTasks] = useState<Task[]>(() => {
    try { const s = localStorage.getItem("av_tasks_v2"); return s ? JSON.parse(s) : INITIAL_TASKS; }
    catch { return INITIAL_TASKS; }
  });
  const [kpis, setKpis] = useState<Kpi[]>(() => {
    try { const s = localStorage.getItem("av_kpis_v2"); return s ? JSON.parse(s) : INITIAL_KPIS; }
    catch { return INITIAL_KPIS; }
  });
  const [content, setContent] = useState<ContentItem[]>(() => {
    try { const s = localStorage.getItem("av_content_v2"); return s ? JSON.parse(s) : INITIAL_CONTENT; }
    catch { return INITIAL_CONTENT; }
  });
  const [notes, setNotes] = useState<Note[]>(() => {
    try { const s = localStorage.getItem("av_notes_v2"); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const [newNote, setNewNote] = useState("");
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterTrack, setFilterTrack] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingKpi, setEditingKpi] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem("av_tasks_v2", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("av_kpis_v2", JSON.stringify(kpis)); }, [kpis]);
  useEffect(() => { localStorage.setItem("av_content_v2", JSON.stringify(content)); }, [content]);
  useEffect(() => { localStorage.setItem("av_notes_v2", JSON.stringify(notes)); }, [notes]);

  const toggleTask = (id: string) => setTasks(ts => ts.map(t => t.id === id ? {...t, done:!t.done} : t));
  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes(ns => [{id:Date.now(), text:newNote, date:new Date().toLocaleDateString("en-GB"), phase:filterPhase==="all"?0:parseInt(filterPhase)}, ...ns]);
    setNewNote("");
  };
  const updateKpi = (id: string, val: string) => setKpis(ks => ks.map(k => k.id === id ? {...k, value:val} : k));
  const updateContent = (id: string, field: string, val: string) => setContent(cs => cs.map(c => c.id === id ? {...c, [field]:val} : c));

  const totalDone = tasks.filter(t=>t.done).length;
  const totalPct = Math.round(totalDone/tasks.length*100);
  const readyCount = content.filter(c=>c.status==="ready").length;
  const publishedCount = content.filter(c=>c.status==="published").length;

  const filteredTasks = tasks.filter(t => {
    if (filterPhase !== "all" && t.phase !== parseInt(filterPhase)) return false;
    if (filterTrack !== "all" && t.track !== filterTrack) return false;
    return true;
  });

  const filteredContent = content.filter(c => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  const s = {
    wrap: { background:C.bg, minHeight:"100vh", fontFamily:"'DM Sans', system-ui, sans-serif", color:C.text, padding:"0" } as React.CSSProperties,
    header: { background:`linear-gradient(135deg, ${C.card} 0%, #0A160A 100%)`, borderBottom:`2px solid ${C.gold}`, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap" as const, gap:"12px" } as React.CSSProperties,
    brand: { display:"flex", alignItems:"center", gap:"12px" } as React.CSSProperties,
    brandName: { fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", color:C.lgold, letterSpacing:"0.05em" } as React.CSSProperties,
    brandSub: { fontSize:"11px", color:C.soft, letterSpacing:"0.1em", textTransform:"uppercase" as const } as React.CSSProperties,
    progress: { display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" as const } as React.CSSProperties,
    progressBar: { width:"160px", height:"6px", background:C.border, borderRadius:"3px", overflow:"hidden" } as React.CSSProperties,
    progressFill: { height:"100%", background:`linear-gradient(90deg, ${C.gold}, ${C.lgold})`, borderRadius:"3px", transition:"width 0.4s" } as React.CSSProperties,
    nav: { display:"flex", gap:"4px", padding:"12px 24px", background:"#0A140A", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap" as const } as React.CSSProperties,
    main: { padding:"20px 24px", maxWidth:"1200px", margin:"0 auto" } as React.CSSProperties,
    card: { background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"14px 16px", marginBottom:"8px" } as React.CSSProperties,
    kpiGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:"12px", marginBottom:"24px" } as React.CSSProperties,
    kpiCard: { background:C.card, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"16px", cursor:"pointer" } as React.CSSProperties,
    kpiValue: { fontSize:"32px", fontWeight:"800", color:C.lgold, fontFamily:"Georgia,serif", lineHeight:1 } as React.CSSProperties,
    noteArea: { display:"flex", gap:"10px", marginBottom:"12px" } as React.CSSProperties,
    noteInput: { flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:"8px", color:C.text, padding:"10px 14px", fontSize:"13px", fontFamily:"inherit", resize:"vertical" as const } as React.CSSProperties,
    noteBtn: { background:C.gold, color:C.bg, border:"none", borderRadius:"8px", padding:"10px 18px", fontWeight:"700", cursor:"pointer", fontSize:"13px", alignSelf:"flex-start" } as React.CSSProperties,
    noteItem: { background:C.card, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"12px 14px", marginBottom:"8px" } as React.CSSProperties,
    noteMeta: { fontSize:"11px", color:C.soft, marginBottom:"6px" } as React.CSSProperties,
    sectionHdr: { fontSize:"18px", fontFamily:"Georgia,serif", color:C.lgold, marginBottom:"4px" } as React.CSSProperties,
    sectionSub: { fontSize:"13px", color:C.soft, marginBottom:"16px" } as React.CSSProperties,
    input: { background:"#0A160A", border:`1px solid ${C.border}`, borderRadius:"6px", color:C.text, padding:"6px 10px", fontSize:"13px", fontFamily:"inherit", width:"100%" } as React.CSSProperties,
    select: { background:"#0A160A", border:`1px solid ${C.border}`, borderRadius:"6px", color:C.text, padding:"5px 8px", fontSize:"12px", fontFamily:"inherit" } as React.CSSProperties,
  };

  const navBtn = (active: boolean): React.CSSProperties => ({ background: active ? C.gold : "transparent", color: active ? C.bg : C.soft, border:`1px solid ${active ? C.gold : C.border}`, borderRadius:"6px", padding:"7px 16px", fontSize:"13px", fontWeight:"600", cursor:"pointer", transition:"all 0.2s" });
  const pill = (active: boolean, color="#1A3A2A"): React.CSSProperties => ({ background: active ? color : "transparent", color: active ? C.cream : C.soft, border:`1px solid ${active ? color : C.border}`, borderRadius:"20px", padding:"4px 12px", fontSize:"12px", fontWeight:"600", cursor:"pointer" });
  const taskCard = (done: boolean, priority: string): React.CSSProperties => ({ background: done ? "#0A160A" : C.card, border:`1px solid ${done ? C.border : priority==="high" ? `${C.gold}50` : C.border}`, borderRadius:"8px", padding:"12px 14px", marginBottom:"6px", display:"flex", alignItems:"flex-start", gap:"12px", opacity: done ? 0.6 : 1, cursor:"pointer", transition:"all 0.15s" });
  const checkbox = (done: boolean): React.CSSProperties => ({ width:"18px", height:"18px", border:`2px solid ${done ? C.lgreen : C.gold}`, borderRadius:"4px", background: done ? C.lgreen : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px", fontSize:"11px" });
  const contentCard = (status: string): React.CSSProperties => ({ background:C.card, border:`1px solid ${status==="published" ? `${C.lgreen}60` : status==="ready" ? `${C.gold}40` : C.border}`, borderRadius:"8px", padding:"14px 16px", marginBottom:"8px" });
  const statusBadge = (status: string): React.CSSProperties => ({ display:"inline-flex", alignItems:"center", gap:"5px", background:`${STATUS_CONFIG[status]?.color}20`, color:STATUS_CONFIG[status]?.color, border:`1px solid ${STATUS_CONFIG[status]?.color}40`, borderRadius:"20px", padding:"3px 10px", fontSize:"11px", fontWeight:"600" });
  const typeBadge = (type: string): React.CSSProperties => ({ display:"inline-flex", alignItems:"center", gap:"4px", background:`${CONTENT_TYPE_CONFIG[type]?.color}20`, color:CONTENT_TYPE_CONFIG[type]?.color, borderRadius:"4px", padding:"2px 8px", fontSize:"11px", fontWeight:"700" });

  return (
    <div style={s.wrap}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={s.brand}>
          <div>
            <div style={s.brandName}>ARDHI VERIFIED</div>
            <div style={s.brandSub}>Launch Command Centre</div>
          </div>
        </div>
        <div style={s.progress}>
          <div style={{fontSize:"12px", color:C.soft}}>Overall Progress</div>
          <div style={s.progressBar}><div style={{...s.progressFill, width:`${totalPct}%`}}/></div>
          <div style={{fontSize:"13px", fontWeight:"700", color:C.lgold}}>{totalPct}%</div>
          <div style={{fontSize:"12px", color:C.soft, marginLeft:"8px"}}>
            {readyCount} content ready | {publishedCount} published
          </div>
        </div>
      </div>

      {/* NAV */}
      <div style={s.nav}>
        {[
          {id:"tasks",   label:"Tasks"},
          {id:"kpis",    label:"KPIs"},
          {id:"content", label:"Content"},
          {id:"phases",  label:"Phases"},
          {id:"notes",   label:"Notes"},
        ].map(v => (
          <button key={v.id} style={navBtn(view===v.id)} onClick={()=>setView(v.id)}>{v.label}</button>
        ))}
      </div>

      <div style={s.main}>

        {/* TASKS */}
        {view === "tasks" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <div style={s.sectionHdr}>Task Board</div>
              <div style={s.sectionSub}>{totalDone} of {tasks.length} tasks complete across all phases</div>
            </div>
            <div style={{display:"flex", gap:"6px", marginBottom:"14px", flexWrap:"wrap"}}>
              {[{id:"all",label:"All Phases"},...PHASES.map(p=>({id:String(p.id),label:p.badge}))].map(p=>(
                <button key={p.id} style={pill(filterPhase===p.id, C.amber)} onClick={()=>setFilterPhase(p.id)}>{p.label}</button>
              ))}
            </div>
            <div style={{display:"flex", gap:"6px", marginBottom:"20px", flexWrap:"wrap"}}>
              {[{id:"all",label:"All"},{id:"supply",label:"Supply"},{id:"demand",label:"Demand"},{id:"trust",label:"Trust"}].map(t=>(
                <button key={t.id} style={pill(filterTrack===t.id, TRACK_CONFIG[t.id]?.color||C.gold)} onClick={()=>setFilterTrack(t.id)}>{t.label}</button>
              ))}
            </div>
            {filteredTasks.length === 0 && <div style={{color:C.soft, fontSize:"13px", textAlign:"center", padding:"24px"}}>No tasks for this filter.</div>}
            {filteredTasks.map(task => {
              const tc = TRACK_CONFIG[task.track];
              const ph = PHASES[task.phase];
              return (
                <div key={task.id} style={taskCard(task.done, task.priority)} onClick={()=>toggleTask(task.id)}>
                  <div style={checkbox(task.done)}>{task.done ? "\u2713" : ""}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"13.5px", color: task.done ? C.soft : C.text, textDecoration: task.done ? "line-through" : "none", lineHeight:"1.45"}}>{task.text}</div>
                    <div style={{display:"flex", gap:"8px", marginTop:"6px", flexWrap:"wrap"}}>
                      <span style={{fontSize:"11px", color:tc?.color, fontWeight:"600"}}>{tc?.icon} {tc?.label}</span>
                      <span style={{fontSize:"11px", color:C.soft}}>{ph?.badge}: {ph?.name}</span>
                      {task.priority === "high" && !task.done && <span style={{fontSize:"11px", color:C.gold, fontWeight:"700"}}>High Priority</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* KPIS */}
        {view === "kpis" && (
          <>
            <div style={{marginBottom:"20px"}}>
              <div style={s.sectionHdr}>KPI Tracker</div>
              <div style={s.sectionSub}>Click any card to update the current value.</div>
            </div>
            <div style={s.kpiGrid}>
              {kpis.map(kpi => (
                <div key={kpi.id} style={s.kpiCard} onClick={()=>setEditingKpi(editingKpi===kpi.id?null:kpi.id)}>
                  <div style={{fontSize:"11px", color:C.soft, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.1em"}}>{kpi.label}</div>
                  {editingKpi === kpi.id ? (
                    <input style={{...s.input, fontSize:"20px", fontWeight:"800", color:C.lgold}} value={kpi.value} onChange={e=>updateKpi(kpi.id, e.target.value)} autoFocus onClick={e=>e.stopPropagation()} />
                  ) : (
                    <div style={s.kpiValue}>{kpi.unit}{kpi.value}</div>
                  )}
                  <div style={{fontSize:"11px", color:C.soft, marginTop:"8px"}}>Target: {kpi.unit}{kpi.target}</div>
                  <div style={{width:"100%", height:"4px", background:C.border, borderRadius:"2px", marginTop:"8px", overflow:"hidden"}}>
                    <div style={{height:"100%", background:C.gold, borderRadius:"2px", width:`${Math.min(100, Math.round((parseFloat(kpi.value)||0)/(parseFloat(kpi.target)||1)*100))}%`, transition:"width 0.4s"}}/>
                  </div>
                  <div style={{fontSize:"10px", color:C.gold, marginTop:"4px"}}>{Math.min(100,Math.round((parseFloat(kpi.value)||0)/(parseFloat(kpi.target)||1)*100))}% of target | {kpi.phase}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CONTENT */}
        {view === "content" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <div style={s.sectionHdr}>Content Command Centre</div>
              <div style={s.sectionSub}>{readyCount} pieces ready to publish | {publishedCount} published | {content.filter(c=>c.status==="planned").length} planned</div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"10px", marginBottom:"20px"}}>
              {(["blog","video","social"] as const).map(type => {
                const tc = CONTENT_TYPE_CONFIG[type];
                const items = content.filter(c=>c.type===type);
                const ready = items.filter(c=>c.status==="ready").length;
                const pub = items.filter(c=>c.status==="published").length;
                return (
                  <div key={type} style={{...s.card, borderColor:`${tc.color}40`}}>
                    <div style={{fontSize:"20px", marginBottom:"4px"}}>{tc.icon}</div>
                    <div style={{fontSize:"13px", fontWeight:"700", color:tc.color}}>{tc.label}</div>
                    <div style={{fontSize:"11px", color:C.soft, marginTop:"4px"}}>{pub} published | {ready} ready | {items.length-pub-ready} planned</div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex", gap:"6px", marginBottom:"20px", flexWrap:"wrap"}}>
              {[{id:"all",label:"All"},{id:"blog",label:"Blog"},{id:"video",label:"Video"},{id:"social",label:"Social"}].map(t=>(
                <button key={t.id} style={pill(filterType===t.id, CONTENT_TYPE_CONFIG[t.id]?.color||C.gold)} onClick={()=>setFilterType(t.id)}>{t.label}</button>
              ))}
              <div style={{width:"1px", background:C.border, margin:"0 4px"}}/>
              {[{id:"all",label:"All Status"},{id:"ready",label:"Ready"},{id:"planned",label:"Planned"},{id:"published",label:"Published"}].map(s2=>(
                <button key={s2.id} style={pill(filterStatus===s2.id, C.lgreen)} onClick={()=>setFilterStatus(s2.id)}>{s2.label}</button>
              ))}
            </div>
            {filteredContent.map(item => {
              const tc = CONTENT_TYPE_CONFIG[item.type];
              const sc = STATUS_CONFIG[item.status];
              const isEditing = editingContent === item.id;
              return (
                <div key={item.id} style={contentCard(item.status)}>
                  <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"12px", flexWrap:"wrap"}}>
                    <div style={{flex:1, minWidth:"200px"}}>
                      <div style={{display:"flex", gap:"8px", alignItems:"center", marginBottom:"6px", flexWrap:"wrap"}}>
                        <span style={typeBadge(item.type)}>{tc?.icon} {tc?.label}</span>
                        <span style={statusBadge(item.status)}>{sc?.dot} {sc?.label}</span>
                      </div>
                      <div style={{fontSize:"14px", fontWeight:"600", color:C.text, lineHeight:"1.4", marginBottom:"4px"}}>{item.title}</div>
                      <div style={{fontSize:"12px", color:C.soft, marginBottom:"4px"}}>{item.platform}</div>
                      <div style={{fontSize:"12px", color:C.muted, lineHeight:"1.4"}}>{item.notes}</div>
                      {item.link && <a href={item.link} target="_blank" rel="noreferrer" style={{fontSize:"12px", color:C.gold, display:"block", marginTop:"4px"}}>{item.link}</a>}
                    </div>
                    <div style={{display:"flex", flexDirection:"column", gap:"6px", minWidth:"120px"}}>
                      <select style={s.select} value={item.status} onChange={e=>updateContent(item.id,"status",e.target.value)} onClick={e=>e.stopPropagation()}>
                        <option value="planned">Planned</option>
                        <option value="ready">Ready</option>
                        <option value="published">Published</option>
                      </select>
                      <button style={{background:"transparent", border:`1px solid ${C.border}`, color:C.soft, borderRadius:"6px", padding:"5px 8px", fontSize:"11px", cursor:"pointer"}} onClick={()=>setEditingContent(isEditing?null:item.id)}>
                        {isEditing ? "Done" : "Edit notes"}
                      </button>
                    </div>
                  </div>
                  {isEditing && (
                    <div style={{marginTop:"10px", display:"flex", flexDirection:"column", gap:"8px"}}>
                      <input style={s.input} placeholder="Publish date (e.g. 15 Apr 2026)" value={item.publishDate} onChange={e=>updateContent(item.id,"publishDate",e.target.value)}/>
                      <input style={s.input} placeholder="Published URL / link" value={item.link} onChange={e=>updateContent(item.id,"link",e.target.value)}/>
                      <textarea style={{...s.input, resize:"vertical" as const, minHeight:"60px"}} placeholder="Notes..." value={item.notes} onChange={e=>updateContent(item.id,"notes",e.target.value)}/>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* PHASES */}
        {view === "phases" && (
          <>
            <div style={{marginBottom:"20px"}}>
              <div style={s.sectionHdr}>Phase Overview</div>
              <div style={s.sectionSub}>Click a phase to jump to its tasks.</div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"12px"}}>
              {PHASES.map(phase => {
                const pTasks = tasks.filter(t=>t.phase===phase.id);
                const pDone = pTasks.filter(t=>t.done).length;
                const pPct = pTasks.length ? Math.round(pDone/pTasks.length*100) : 0;
                const highPri = pTasks.filter(t=>!t.done&&t.priority==="high").length;
                return (
                  <div key={phase.id} style={{...s.card, borderColor:`${phase.color}60`, cursor:"pointer"}} onClick={()=>{setView("tasks");setFilterPhase(String(phase.id));}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px"}}>
                      <span style={{fontSize:"12px", fontWeight:"800", color:C.cream, background:phase.color, padding:"3px 10px", borderRadius:"20px"}}>{phase.badge}</span>
                      <span style={{fontSize:"12px", color:C.soft}}>{phase.weeks}</span>
                    </div>
                    <div style={{fontSize:"16px", fontWeight:"700", color:C.text, marginBottom:"8px"}}>{phase.name}</div>
                    <div style={{width:"100%", height:"6px", background:C.border, borderRadius:"3px", overflow:"hidden", marginBottom:"8px"}}>
                      <div style={{height:"100%", background:C.gold, borderRadius:"3px", width:`${pPct}%`, transition:"width 0.4s"}}/>
                    </div>
                    <div style={{display:"flex", justifyContent:"space-between", fontSize:"12px"}}>
                      <span style={{color:C.soft}}>{pDone}/{pTasks.length} tasks</span>
                      <span style={{color:C.lgold, fontWeight:"700"}}>{pPct}%</span>
                    </div>
                    {highPri > 0 && <div style={{fontSize:"11px", color:C.gold, marginTop:"6px"}}>{highPri} high priority remaining</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* NOTES */}
        {view === "notes" && (
          <>
            <div style={{marginBottom:"16px"}}>
              <div style={s.sectionHdr}>Launch Notes</div>
              <div style={s.sectionSub}>Record decisions, SACCO conversations, buyer feedback, wins and blockers.</div>
            </div>
            <div style={s.noteArea}>
              <textarea style={s.noteInput} rows={3} placeholder="Add a note — Ctrl+Enter to save" value={newNote} onChange={e=>setNewNote(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&e.ctrlKey)addNote();}}/>
              <button style={s.noteBtn} onClick={addNote}>Add Note</button>
            </div>
            {notes.length === 0 && <div style={{fontSize:"13px", color:C.soft, textAlign:"center", padding:"24px"}}>No notes yet.</div>}
            {notes.map(note=>(
              <div key={note.id} style={s.noteItem}>
                <div style={s.noteMeta}>{note.date} | {PHASES[note.phase]?.badge}: {PHASES[note.phase]?.name}</div>
                <div style={{fontSize:"13px", color:C.text, lineHeight:"1.5"}}>{note.text}</div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  );
}
