import { useState, useEffect, useCallback, useRef } from "react";
import { loadShared, saveShared } from "./firebase.js";

const TEAM = [
  { id: "ignacio", name: "Ignacio", color: "#00cfff", initials: "IG" },
  { id: "fabiola", name: "Fabiola", color: "#c084fc", initials: "FA" },
  { id: "lucas", name: "Lucas", color: "#fb923c", initials: "LU" },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [descartados, setDescartados] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [feedback, setFeedback] = useState({});
  const [feedbackLog, setFeedbackLog] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [filtroAsignado, setFiltroAsignado] = useState("todos");
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [mostrarLog, setMostrarLog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [assigningAll, setAssigningAll] = useState(false);
  const syncInterval = useRef(null);

  const syncFromStorage = useCallback(async () => {
    setSyncing(true);
    const data = await loadShared();
    if (data.leads?.length > 0) setLeads(data.leads);
    if (data.descartados?.length > 0) setDescartados(data.descartados);
    if (data.assignments) setAssignments(data.assignments);
    if (data.feedback) setFeedback(data.feedback);
    if (data.feedbackLog) setFeedbackLog(data.feedbackLog);
    if (data.lastSync) setUltimaActualizacion(data.lastSync);
    setSyncing(false);
  }, []);

  useEffect(() => {
    syncFromStorage();
    syncInterval.current = setInterval(syncFromStorage, 15000);
    return () => clearInterval(syncInterval.current);
  }, [syncFromStorage]);

  const persist = useCallback(async (nl, nd, na, nf, nfl) => {
    const ts = new Date().toLocaleString("es-AR");
    await saveShared({ leads: nl, descartados: nd, assignments: na, feedback: nf, feedbackLog: nfl, lastSync: ts });
    setUltimaActualizacion(ts);
  }, []);

  const asignarLead = useCallback(async (leadId) => {
    const m = TEAM[Math.floor(Math.random() * TEAM.length)];
    const na = { ...assignments, [leadId]: { userId: m.id, userName: m.name, assignedAt: new Date().toLocaleString("es-AR"), assignedBy: currentUser.name } };
    setAssignments(na);
    await persist(leads, descartados, na, feedback, feedbackLog);
  }, [assignments, leads, descartados, feedback, feedbackLog, currentUser, persist]);

  const asignarTodos = useCallback(async () => {
    setAssigningAll(true);
    const na = { ...assignments };
    for (const lead of leads.filter(l => !assignments[l.thread_id])) {
      const m = TEAM[Math.floor(Math.random() * TEAM.length)];
      na[lead.thread_id] = { userId: m.id, userName: m.name, assignedAt: new Date().toLocaleString("es-AR"), assignedBy: currentUser.name };
      await new Promise(r => setTimeout(r, 80));
    }
    setAssignments(na);
    await persist(leads, descartados, na, feedback, feedbackLog);
    setAssigningAll(false);
  }, [assignments, leads, descartados, feedback, feedbackLog, currentUser, persist]);

  const reasignarLead = useCallback(async (leadId, userId) => {
    const m = TEAM.find(t => t.id === userId);
    const na = { ...assignments, [leadId]: { userId: m.id, userName: m.name, assignedAt: new Date().toLocaleString("es-AR"), assignedBy: currentUser.name } };
    setAssignments(na);
    await persist(leads, descartados, na, feedback, feedbackLog);
  }, [assignments, leads, descartados, feedback, feedbackLog, currentUser, persist]);

  const darFeedback = useCallback(async (lead, tipo) => {
    const nf = { ...feedback, [lead.thread_id]: tipo };
    const entrada = { timestamp: new Date().toLocaleString("es-AR"), tipo, usuario: currentUser.name, empresa: lead.empresa || "(sin empresa)", categoria: lead.categoria, score: lead.score, motivo: lead.motivo };
    const nfl = [entrada, ...feedbackLog];
    setFeedback(nf); setFeedbackLog(nfl);
    await persist(leads, descartados, assignments, nf, nfl);
  }, [feedback, feedbackLog, leads, descartados, assignments, currentUser, persist]);

  const scoreColor = s => s >= 8 ? "#00ff87" : s >= 5 ? "#ffd60a" : "#ff6b6b";
  const cat1 = leads.filter(l => l.categoria === 1);
  const cat2 = leads.filter(l => l.categoria === 2);
  const filtradosCat = filtro === "cat1" ? cat1 : filtro === "cat2" ? cat2 : filtro === "descartados" ? [] : leads;
  const filtrados = filtroAsignado === "todos" ? filtradosCat
    : filtroAsignado === "sinasignar" ? filtradosCat.filter(l => !assignments[l.thread_id])
    : filtradosCat.filter(l => assignments[l.thread_id]?.userId === filtroAsignado);
  const mostrandoDescartados = filtro === "descartados";
  const fbPos = Object.values(feedback).filter(v => v === "up").length;
  const fbNeg = Object.values(feedback).filter(v => v === "down").length;
  const sinAsignar = leads.filter(l => !assignments[l.thread_id]).length;

  if (!currentUser) return (
    <div style={{ fontFamily: "'DM Mono','Courier New',monospace", background: "#08080e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "32px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "36px", fontWeight: 800, color: "#fff" }}>LEAD<span style={{ color: "#00ff87" }}>RADAR</span></h1>
        <div style={{ fontSize: "10px", color: "#303050", letterSpacing: "3px", marginTop: "6px" }}>SLG · PANEL DEL EQUIPO</div>
      </div>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
        {TEAM.map(m => (
          <button key={m.id} onClick={() => setCurrentUser(m)}
            style={{ background: "#0c0c18", border: `1px solid ${m.color}40`, borderRadius: "8px", padding: "28px 40px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.background = `${m.color}08`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${m.color}40`; e.currentTarget.style.background = "#0c0c18"; }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: `${m.color}20`, border: `2px solid ${m.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontFamily: "'Syne',sans-serif", fontWeight: 800, color: m.color }}>{m.initials}</div>
            <div style={{ fontSize: "15px", color: "#fff", fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>{m.name}</div>
            <div style={{ fontSize: "9px", color: "#404060", letterSpacing: "2px" }}>INGRESAR</div>
          </button>
        ))}
      </div>
      <div style={{ fontSize: "10px", color: "#202030", letterSpacing: "1px" }}>Los leads son cargados desde Claude · Datos en tiempo real</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Mono','Courier New',monospace", background: "#08080e", minHeight: "100vh", color: "#e0e0ee" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#08080e}::-webkit-scrollbar-thumb{background:#202030}
        .card{transition:border-color 0.2s,transform 0.15s;border:1px solid #181828}.card:hover{border-color:#303050;transform:translateY(-1px)}
        .fb-btn{cursor:pointer;transition:all 0.15s;border:1px solid;border-radius:3px;padding:5px 12px;font-size:13px;background:transparent;font-family:inherit}.fb-btn:hover{transform:scale(1.08)}
        .pill{cursor:pointer;user-select:none;transition:opacity 0.15s}.pill:hover{opacity:0.75}
        .assign-btn{cursor:pointer;border:1px solid #282838;border-radius:2px;padding:4px 10px;font-size:9px;letter-spacing:1px;font-family:inherit;background:transparent;color:#606080;transition:all 0.15s}.assign-btn:hover{border-color:#505070;color:#e0e0ee}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp 0.3s ease forwards;opacity:0}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>

      {/* HEADER */}
      <div style={{ background: "#0c0c18", borderBottom: "1px solid #181828", padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "3px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: syncing ? "#ffd60a" : "#00ff87", boxShadow: `0 0 7px ${syncing ? "#ffd60a" : "#00ff87"}`, animation: syncing ? "pulse 1s infinite" : "none" }} />
            <span style={{ fontSize: "9px", letterSpacing: "3px", color: "#404060" }}>
              {syncing ? "SINCRONIZANDO..." : ultimaActualizacion ? `SYNC ${ultimaActualizacion}` : "CARGANDO..."}
            </span>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "22px", fontWeight: 800, color: "#fff" }}>
            LEAD<span style={{ color: "#00ff87" }}>RADAR</span>
            <span style={{ fontSize: "9px", fontWeight: 400, color: "#282840", letterSpacing: "3px", marginLeft: "10px" }}>SLG · PANEL EQUIPO</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          {[{ label: "DDHH", value: cat1.length, color: "#ff6b6b" }, { label: "REG.", value: cat2.length, color: "#ffd60a" }, { label: "SIN ASIGNAR", value: sinAsignar, color: sinAsignar > 0 ? "#ff9f43" : "#303050" }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontFamily: "'Syne',sans-serif", color: s.color, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: "8px", color: "#404060", letterSpacing: "2px" }}>{s.label}</div>
            </div>
          ))}
          <div style={{ width: "1px", height: "30px", background: "#181828" }} />
          {sinAsignar > 0 && (
            <button onClick={asignarTodos} disabled={assigningAll} style={{ background: "#ff9f4315", border: "1px solid #ff9f43", color: "#ff9f43", padding: "7px 13px", borderRadius: "3px", fontSize: "10px", letterSpacing: "1px", fontFamily: "inherit", cursor: "pointer" }}>
              {assigningAll ? "ASIGNANDO..." : `⚡ ASIGNAR ${sinAsignar}`}
            </button>
          )}
          <button onClick={syncFromStorage} style={{ background: "#00ff8715", border: "1px solid #00ff87", color: "#00ff87", padding: "7px 13px", borderRadius: "3px", fontSize: "10px", letterSpacing: "1px", fontFamily: "inherit", cursor: "pointer" }}>
            ↻ SYNC
          </button>
          <div style={{ width: "1px", height: "30px", background: "#181828" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: `${currentUser.color}20`, border: `2px solid ${currentUser.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontFamily: "'Syne',sans-serif", fontWeight: 800, color: currentUser.color }}>{currentUser.initials}</div>
            <div>
              <div style={{ fontSize: "11px", color: currentUser.color, fontWeight: 600 }}>{currentUser.name}</div>
              <div onClick={() => setCurrentUser(null)} style={{ fontSize: "9px", color: "#303050", cursor: "pointer", textDecoration: "underline" }}>cambiar</div>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER SIN LEADS */}
      {leads.length === 0 && !syncing && (
        <div style={{ background: "#0e0e1c", borderBottom: "1px solid #181828", padding: "12px 28px", fontSize: "11px", color: "#404060", textAlign: "center" }}>
          Los leads son analizados desde Claude y aparecen acá automáticamente. Pedile a quien gestiona Claude que actualice las alertas.
        </div>
      )}

      {/* BANNER ENTRENAMIENTO */}
      {(fbPos + fbNeg) > 0 && (
        <div style={{ background: "#0e0e1c", borderBottom: "1px solid #181828", padding: "8px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: "#404060" }}>
            ENTRENAMIENTO: <span style={{ color: "#00ff87" }}>👍 {fbPos}</span>
            {fbNeg > 0 && <span style={{ color: "#ff6b6b", marginLeft: "10px" }}>👎 {fbNeg}</span>}
          </span>
          <span onClick={() => setMostrarLog(!mostrarLog)} style={{ fontSize: "10px", color: "#404060", cursor: "pointer", textDecoration: "underline" }}>{mostrarLog ? "ocultar log" : "ver log"}</span>
        </div>
      )}

      {/* LOG */}
      {mostrarLog && feedbackLog.length > 0 && (
        <div style={{ background: "#0a0a14", borderBottom: "1px solid #181828", padding: "12px 28px", maxHeight: "160px", overflowY: "auto" }}>
          {feedbackLog.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", padding: "5px 0", borderBottom: "1px solid #10101e", fontSize: "11px", flexWrap: "wrap" }}>
              <span style={{ color: e.tipo === "up" ? "#00ff87" : "#ff6b6b", minWidth: "50px" }}>{e.tipo === "up" ? "✓ OK" : "✗ ERR"}</span>
              <span style={{ color: TEAM.find(m => m.name === e.usuario)?.color || "#e0e0ee" }}>{e.usuario}</span>
              <span style={{ color: "#e0e0ee" }}>{e.empresa}</span>
              <span style={{ color: "#404060" }}>cat.{e.categoria} · {e.score}/10</span>
              <span style={{ color: "#303050", flex: 1 }}>{e.motivo}</span>
              <span style={{ color: "#202030" }}>{e.timestamp}</span>
            </div>
          ))}
        </div>
      )}

      {/* FILTROS */}
      <div style={{ padding: "12px 28px", borderBottom: "1px solid #181828", display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[{ key: "todos", label: "Todos", count: leads.length, color: "#00ff87" }, { key: "cat1", label: "⚠ DDHH", count: cat1.length, color: "#ff6b6b" }, { key: "cat2", label: "📋 Regulatorio", count: cat2.length, color: "#ffd60a" }, { key: "descartados", label: "✗ Descartados", count: descartados.length, color: "#505068" }].map(f => (
            <div key={f.key} className="pill" onClick={() => setFiltro(f.key)} style={{ padding: "4px 11px", borderRadius: "2px", fontSize: "10px", letterSpacing: "1px", border: "1px solid", borderColor: filtro === f.key ? f.color : "#181828", background: filtro === f.key ? `${f.color}12` : "transparent", color: filtro === f.key ? f.color : "#404060", display: "flex", gap: "6px", alignItems: "center" }}>
              {f.label} <span style={{ background: filtro === f.key ? `${f.color}20` : "#181828", padding: "1px 6px", borderRadius: "8px", fontSize: "9px" }}>{f.count}</span>
            </div>
          ))}
        </div>
        {!mostrandoDescartados && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "9px", color: "#303050", letterSpacing: "1px" }}>VER:</span>
            {[{ key: "todos", label: "Todos" }, { key: "sinasignar", label: "Sin asignar" }, ...TEAM.map(m => ({ key: m.id, label: m.name, color: m.color }))].map(f => (
              <div key={f.key} className="pill" onClick={() => setFiltroAsignado(f.key)} style={{ padding: "3px 9px", borderRadius: "2px", fontSize: "9px", letterSpacing: "1px", border: "1px solid", borderColor: filtroAsignado === f.key ? (f.color || "#00ff87") : "#181828", background: filtroAsignado === f.key ? `${f.color || "#00ff87"}12` : "transparent", color: filtroAsignado === f.key ? (f.color || "#00ff87") : "#404060" }}>
                {f.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LEADS */}
      <div style={{ padding: "20px 28px", display: "grid", gap: "11px" }}>
        {filtrados.length === 0 && !syncing && !mostrandoDescartados && (
          <div style={{ textAlign: "center", padding: "50px", color: "#202030" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>◌</div>
            <div style={{ fontSize: "10px", letterSpacing: "3px" }}>SIN LEADS EN ESTA VISTA</div>
          </div>
        )}

        {filtrados.map((lead, i) => {
          const fb = feedback[lead.thread_id];
          const fbProp = feedback[lead.thread_id + "_prop"];
          const isCat1 = lead.categoria === 1;
          const catColor = isCat1 ? "#ff6b6b" : "#ffd60a";
          const asign = assignments[lead.thread_id];
          const asignMember = asign ? TEAM.find(m => m.id === asign.userId) : null;
          return (
            <div key={lead.thread_id} className="card fade-up" style={{ background: "#0c0c18", borderRadius: "4px", padding: "18px 20px", animationDelay: `${i * 0.05}s`, opacity: fb === "down" ? 0.3 : 0, transition: "opacity 0.3s" }}>
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "240px" }}>
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "9px", alignItems: "center" }}>
                    <div style={{ padding: "2px 8px", borderRadius: "2px", fontSize: "9px", letterSpacing: "2px", fontWeight: 600, background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}35` }}>{isCat1 ? "⚠ DDHH" : "📋 REG."}</div>
                    <div style={{ padding: "2px 8px", borderRadius: "2px", fontSize: "9px", background: `${scoreColor(lead.score)}15`, color: scoreColor(lead.score), border: `1px solid ${scoreColor(lead.score)}30` }}>{lead.score}/10</div>
                    {lead.sector && <div style={{ padding: "2px 8px", borderRadius: "2px", fontSize: "9px", background: "#181828", color: "#606080", border: "1px solid #282838" }}>{lead.sector}</div>}
                    {lead.organismo && <div style={{ padding: "2px 8px", borderRadius: "2px", fontSize: "9px", background: "#0a1828", color: "#00cfff", border: "1px solid #00cfff25" }}>⚖ {lead.organismo}</div>}
                    {lead.pais && <span style={{ fontSize: "10px", color: "#303050" }}>📍 {lead.pais}</span>}
                  </div>
                  {lead.empresa && <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "15px", fontWeight: 800, color: "#fff", marginBottom: "5px" }}>{lead.empresa}</div>}
                  <div style={{ fontSize: "11px", color: "#505070", marginBottom: "11px", lineHeight: 1.5 }}>{lead.motivo}</div>
                  {(lead.area_contacto || lead.servicio_principal || lead.propuesta) && (
                    <div style={{ border: "1px solid #00ff8720", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ background: "#00ff8710", padding: "4px 11px", fontSize: "9px", letterSpacing: "2px", color: "#00ff8780", borderBottom: "1px solid #00ff8718" }}>PLAN DE ACCIÓN</div>
                      <div style={{ padding: "10px 11px", display: "grid", gap: "8px" }}>
                        {lead.area_contacto && <div><div style={{ fontSize: "9px", color: "#00cfff60", letterSpacing: "2px", marginBottom: "2px" }}>CONTACTAR</div><div style={{ fontSize: "11px", color: "#00cfff" }}>👤 {lead.area_contacto}</div></div>}
                        {lead.servicio_principal && <div><div style={{ fontSize: "9px", color: "#ffd60a60", letterSpacing: "2px", marginBottom: "2px" }}>SERVICIO</div><div style={{ fontSize: "11px", color: "#ffd60a" }}>⚙ {lead.servicio_principal}</div></div>}
                        {lead.propuesta && (
                          <div>
                            <div style={{ fontSize: "9px", color: "#00ff8760", letterSpacing: "2px", marginBottom: "2px" }}>PROPUESTA</div>
                            <div style={{ fontSize: "11px", color: "#00ff87", lineHeight: 1.5 }}>→ {lead.propuesta}</div>
                            <div style={{ marginTop: "7px", display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "9px", color: "#303050" }}>¿Propuesta correcta?</span>
                              <button className="fb-btn" onClick={() => darFeedback({ ...lead, thread_id: lead.thread_id + "_prop", empresa: lead.empresa + " (propuesta)", motivo: lead.propuesta }, "up")} style={{ borderColor: fbProp === "up" ? "#00ff87" : "#282838", color: fbProp === "up" ? "#00ff87" : "#404060", background: fbProp === "up" ? "#00ff8715" : "transparent", padding: "2px 7px", fontSize: "11px" }}>👍</button>
                              <button className="fb-btn" onClick={() => darFeedback({ ...lead, thread_id: lead.thread_id + "_prop", empresa: lead.empresa + " (propuesta)", motivo: lead.propuesta }, "down")} style={{ borderColor: fbProp === "down" ? "#ff6b6b" : "#282838", color: fbProp === "down" ? "#ff6b6b" : "#404060", background: fbProp === "down" ? "#ff6b6b15" : "transparent", padding: "2px 7px", fontSize: "11px" }}>👎</button>
                              {fbProp && <span style={{ fontSize: "9px", color: fbProp === "up" ? "#00ff87" : "#ff6b6b" }}>{fbProp === "up" ? "✓ Ok" : "✗ Mejorar"}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "110px", alignItems: "flex-end" }}>
                  <div style={{ fontSize: "10px", color: "#282840" }}>{new Date(lead.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}</div>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end" }}>
                    <div style={{ fontSize: "9px", color: "#303050", letterSpacing: "1px" }}>ASIGNADO A</div>
                    {asignMember ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: `${asignMember.color}20`, border: `1.5px solid ${asignMember.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontFamily: "'Syne',sans-serif", fontWeight: 800, color: asignMember.color }}>{asignMember.initials}</div>
                          <span style={{ fontSize: "11px", color: asignMember.color, fontWeight: 600 }}>{asignMember.name}</span>
                        </div>
                        <div style={{ fontSize: "8px", color: "#282840" }}>por {asign.assignedBy}</div>
                        <div style={{ display: "flex", gap: "3px" }}>
                          {TEAM.filter(m => m.id !== asign.userId).map(m => (
                            <button key={m.id} className="assign-btn" onClick={() => reasignarLead(lead.thread_id, m.id)} style={{ color: m.color, borderColor: `${m.color}40` }}>→ {m.name}</button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button className="assign-btn" onClick={() => asignarLead(lead.thread_id)} style={{ background: "#ff9f4310", color: "#ff9f43", borderColor: "#ff9f4340" }}>⚡ ASIGNAR</button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end" }}>
                    <div style={{ fontSize: "9px", color: "#303050", letterSpacing: "1px" }}>¿Es lead?</div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button className="fb-btn" onClick={() => darFeedback(lead, "up")} style={{ borderColor: fb === "up" ? "#00ff87" : "#282838", color: fb === "up" ? "#00ff87" : "#404060", background: fb === "up" ? "#00ff8715" : "transparent" }}>👍</button>
                      <button className="fb-btn" onClick={() => darFeedback(lead, "down")} style={{ borderColor: fb === "down" ? "#ff6b6b" : "#282838", color: fb === "down" ? "#ff6b6b" : "#404060", background: fb === "down" ? "#ff6b6b15" : "transparent" }}>👎</button>
                    </div>
                    {fb && <div style={{ fontSize: "9px", color: fb === "up" ? "#00ff87" : "#ff6b6b" }}>{fb === "up" ? "✓ Confirmado" : "✗ Rechazado"}</div>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* DESCARTADOS */}
        {mostrandoDescartados && descartados.length === 0 && !syncing && (
          <div style={{ textAlign: "center", padding: "50px", color: "#202030" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>◌</div>
            <div style={{ fontSize: "10px", letterSpacing: "3px" }}>SIN ALERTAS DESCARTADAS</div>
          </div>
        )}
        {mostrandoDescartados && descartados.map((d, i) => {
          const fb = feedback[d.thread_id];
          return (
            <div key={d.thread_id} className="card fade-up" style={{ background: "#0a0a12", borderRadius: "4px", padding: "16px 20px", animationDelay: `${i * 0.04}s`, opacity: fb === "up" ? 0.35 : 0, transition: "opacity 0.3s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "7px", alignItems: "center" }}>
                    <div style={{ padding: "2px 8px", borderRadius: "2px", fontSize: "9px", letterSpacing: "2px", background: "#181828", color: "#404060", border: "1px solid #242430" }}>✗ DESCARTADO</div>
                    {d.organismo && <div style={{ padding: "2px 8px", borderRadius: "2px", fontSize: "9px", background: "#0a1828", color: "#00cfff80", border: "1px solid #00cfff15" }}>⚖ {d.organismo}</div>}
                    {d.pais && <span style={{ fontSize: "10px", color: "#282840" }}>📍 {d.pais}</span>}
                  </div>
                  <div style={{ fontSize: "12px", color: "#505068", marginBottom: "4px", fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>{d.subject?.replace("Google Alert - ", "").replace("Alerta de Google: ", "")}</div>
                  <div style={{ fontSize: "11px", color: "#303048", lineHeight: 1.5 }}>{d.motivo}</div>
                  {fb === "down" && <div style={{ marginTop: "7px", fontSize: "11px", color: "#ff6b6b", background: "#ff6b6b08", border: "1px solid #ff6b6b20", borderRadius: "2px", padding: "6px 10px" }}>⚠ Marcado como error — informalo para ajustar el criterio.</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                  <div style={{ fontSize: "10px", color: "#202030" }}>{new Date(d.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}</div>
                  <div style={{ fontSize: "9px", color: "#282840", letterSpacing: "1px" }}>¿Correcto descartar?</div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button className="fb-btn" onClick={() => darFeedback(d, "up")} style={{ borderColor: fb === "up" ? "#00ff87" : "#282838", color: fb === "up" ? "#00ff87" : "#404060", background: fb === "up" ? "#00ff8715" : "transparent" }}>👍</button>
                    <button className="fb-btn" onClick={() => darFeedback(d, "down")} style={{ borderColor: fb === "down" ? "#ff6b6b" : "#282838", color: fb === "down" ? "#ff6b6b" : "#404060", background: fb === "down" ? "#ff6b6b15" : "transparent" }}>👎</button>
                  </div>
                  {fb && <div style={{ fontSize: "9px", color: fb === "up" ? "#00ff87" : "#ff6b6b" }}>{fb === "up" ? "✓ Ok" : "✗ Error"}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div style={{ padding: "12px 28px", borderTop: "1px solid #181828", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
          {TEAM.map(m => {
            const count = Object.values(assignments).filter(a => a.userId === m.id).length;
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: `${m.color}20`, border: `1.5px solid ${m.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7px", fontFamily: "'Syne',sans-serif", fontWeight: 800, color: m.color }}>{m.initials}</div>
                <span style={{ fontSize: "9px", color: m.color }}>{m.name}: {count}</span>
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: "9px", color: "#202030" }}>Firebase · sync 15s · {fbPos + fbNeg > 0 ? `${fbPos + fbNeg} feedbacks` : "👍👎 para entrenar"}</span>
      </div>
    </div>
  );
}
