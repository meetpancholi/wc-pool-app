import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dices, User, Trophy, Flag, Settings, RefreshCw, Copy, Check, Lock,
  Users, Coins, ShieldCheck, X, Clock, Bell,
} from "lucide-react";
import { supabase } from "./supabaseClient.js";

const MAX = 24, BUYIN = 1000;
const GROUPS = "ABCDEFGHIJKL".split("");
const C = {
  navy: "#0a1628", panel: "#0f2138", line: "#22426c", teal: "#00b5b8",
  red: "#e8402a", gold: "#e3b23c", text: "#eef3f8", sub: "#8aa0bb",
};

/* ---------- atoms ---------- */
const Card = ({ children, style }) => (
  <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, ...style }}>{children}</div>
);
function StatusDot({ s }) {
  const m = { active: C.teal, out: C.red, champion: C.gold };
  return <span style={{ width: 8, height: 8, borderRadius: 99, background: m[s], display: "inline-block" }} />;
}
function Btn({ children, onClick, kind = "primary", disabled, full }) {
  const bg = { primary: C.teal, gold: C.gold, red: C.red, ghost: "transparent" }[kind];
  const ghost = kind === "ghost";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#1a2c47" : bg, color: ghost ? C.text : (kind === "gold" ? "#1a1206" : "#04161a"),
      border: ghost ? `1px solid ${C.line}` : "none", borderRadius: 12, padding: "13px 18px",
      fontWeight: 700, fontSize: 15, cursor: disabled ? "default" : "pointer", width: full ? "100%" : "auto",
      opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    }}>{children}</button>
  );
}
function TeamChip({ t, status, small }) {
  const col = status === "out" ? C.red : status === "champion" ? C.gold : C.teal;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: small ? "3px 8px" : "5px 10px",
      borderRadius: 8, background: "#0c1c33", border: `1px solid ${col}33`, color: C.text,
      fontSize: small ? 12 : 13, opacity: status === "out" ? 0.55 : 1,
      textDecoration: status === "out" ? "line-through" : "none", whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: small ? 13 : 15 }}>{t.flag}</span>{t.name}
      {status === "champion" && <Trophy size={12} color={C.gold} />}
    </span>
  );
}

/* ---------- push alerts ---------- */
const VAPID_KEY = import.meta.env.VITE_VAPID_APP_SERVER_KEY;
function urlB64ToUint8(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s); const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
function EnableAlerts({ name }) {
  const [state, setState] = useState("idle"); const [msg, setMsg] = useState("");
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  useEffect(() => { if (!supported) setState("unsupported"); }, [supported]);
  async function enable() {
    try {
      if (!VAPID_KEY) { setState("err"); setMsg("Push key not configured."); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("err"); setMsg("Notifications were blocked in the browser."); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(VAPID_KEY) });
      const { error } = await supabase.rpc("save_subscription", { p_name: name, p_sub: sub.toJSON() });
      if (error) { setState("err"); setMsg("Could not save. Try again."); return; }
      setState("on");
    } catch { setState("err"); setMsg("Could not enable alerts on this device."); }
  }
  if (state === "unsupported") return null;
  return (
    <Card>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Match alerts</div>
      <div style={{ color: C.sub, fontSize: 13, marginBottom: 12 }}>Get a notification on this phone when one of your teams is knocked out, and when the champion is decided.</div>
      {state === "on"
        ? <div style={{ color: C.teal, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><Check size={16} /> Alerts on for {name}</div>
        : <><Btn full onClick={enable}><Bell size={17} /> Turn on alerts</Btn>{msg && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{msg}</div>}</>}
      <div style={{ color: C.sub, fontSize: 11, marginTop: 10 }}>On iPhone: add this site to your Home Screen first, then open it from there to enable alerts.</div>
    </Card>
  );
}

/* ============================ APP ============================ */
export default function App() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);     // {id,name,paid,picks:[teamId]}
  const [config, setConfig] = useState(null);
  const [matches, setMatches] = useState([]);
  const [tab, setTab] = useState("draw");
  const [myName, setMyName] = useState("");
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const reduced = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  const statusOf = useCallback((id) => (config?.champion_team_id === id ? "champion" : (teamMap[id]?.status || "active")), [config, teamMap]);

  const loadAll = useCallback(async () => {
    const [{ data: t }, { data: pa }, { data: pk }, { data: cfg }, { data: mt }] = await Promise.all([
      supabase.from("teams").select("*").order("grp"),
      supabase.from("participants").select("*").order("created"),
      supabase.from("picks").select("*"),
      supabase.from("pool_public").select("*").single(),
      supabase.from("matches").select("*").eq("status", "FINISHED").order("utc_date", { ascending: false }).limit(12),
    ]);
    setTeams(t || []); setConfig(cfg || {}); setMatches(mt || []);
    const byP = {};
    (pk || []).forEach((p) => { (byP[p.participant_id] ||= []).push(p.team_id); });
    setPlayers((pa || []).map((p) => ({ ...p, picks: byP[p.id] || [] })));
  }, []);

  useEffect(() => {
    loadAll();
    const ch = supabase.channel("pool")
      .on("postgres_changes", { event: "*", schema: "public" }, () => loadAll())
      .subscribe();
    const iv = setInterval(loadAll, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, [loadAll]);

  if (!config) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: C.sub, fontFamily: "Montserrat,system-ui" }}>Loading…</div>;

  const potPaid = players.filter((p) => p.paid).length * BUYIN;
  const aliveCount = (p) => p.picks.filter((id) => statusOf(id) !== "out").length;

  return (
    <div className="nilson" style={{ background: C.navy, minHeight: "100vh", color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        .nilson,.nilson *{font-family:'Montserrat',system-ui,-apple-system,sans-serif;box-sizing:border-box}
        @keyframes pop{0%{transform:scale(.92);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "18px 14px 96px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: C.teal, fontWeight: 700 }}>WORLD CUP 2026</div>
            <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1 }}>Winner Takes All</div>
          </div>
          <button onClick={loadAll} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 9, color: C.sub, cursor: "pointer" }}><RefreshCw size={16} /></button>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <Card style={{ flex: 1, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.sub, fontSize: 11, letterSpacing: 1 }}><Users size={13} /> SLOTS</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{players.length}<span style={{ color: C.sub, fontSize: 15 }}>/{MAX}</span></div>
          </Card>
          <Card style={{ flex: 1, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.sub, fontSize: 11, letterSpacing: 1 }}><Coins size={13} /> PRIZE POOL</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.gold }}>{potPaid.toLocaleString()}<span style={{ color: C.sub, fontSize: 13 }}> KSh</span></div>
          </Card>
        </div>

        {tab === "draw" && <DrawView {...{ players, teams, statusOf, teamMap, myName, setMyName, reduced, onDone: loadAll }} />}
        {tab === "mine" && <MineView {...{ players, teamMap, statusOf, aliveCount, myName, setMyName }} />}
        {tab === "standings" && <StandingsView {...{ players, teamMap, statusOf, aliveCount, matches }} />}
        {tab === "teams" && <TeamsView {...{ teams, players, statusOf, config }} />}
        {tab === "admin" && <AdminView {...{ teams, players, statusOf, teamMap, config, matches, onDone: loadAll }} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#081120ee", borderTop: `1px solid ${C.line}`, backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(5,1fr)" }}>
          {[["draw", "Draw", Dices], ["mine", "My Teams", User], ["standings", "Standings", Trophy], ["teams", "Teams", Flag], ["admin", "Admin", Settings]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} style={{ background: "none", border: "none", padding: "10px 4px 12px", cursor: "pointer", color: tab === id ? C.teal : C.sub, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Icon size={20} /><span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Draw ---------- */
function DrawView({ players, teams, statusOf, teamMap, myName, setMyName, reduced, onDone }) {
  const [phase, setPhase] = useState("intro"); // intro | reveal | done
  const [reel, setReel] = useState(teams[0]);
  const [result, setResult] = useState([]);
  const [shown, setShown] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const full = players.length >= MAX;

  async function start() {
    setErr("");
    if (!myName.trim()) return setErr("Enter your name to start.");
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_random_teams", { p_name: myName.trim() });
    setBusy(false);
    if (error) {
      const m = { POOL_FULL: "The pool is full — all 24 slots are taken.", NAME_TAKEN: "That name has already drawn. Check My Teams.", NAME_REQUIRED: "Enter your name." };
      return setErr(m[(error.message.match(/[A-Z_]+/) || [])[0]] || "Could not draw. Try again.");
    }
    setResult(data); setShown(0); setPhase("reveal"); spinTo(data[0], () => setShown(1));
    onDone();
  }
  function spinTo(target, cb) {
    if (reduced.current) { setReel(target); cb(); return; }
    let delay = 55; const t0 = Date.now();
    const tick = () => {
      setReel(teams[Math.floor(Math.random() * teams.length)]);
      if (Date.now() - t0 > 1300) delay += 28;
      if (delay > 300) { setReel(target); cb(); return; }
      setTimeout(tick, delay);
    };
    tick();
  }
  function revealSecond() { spinTo(result[1], () => { setShown(2); setTimeout(() => setPhase("done"), 500); }); }

  if (full && phase === "intro") return (
    <Card style={{ textAlign: "center" }}>
      <Lock size={28} color={C.sub} /><div style={{ fontWeight: 700, marginTop: 8 }}>The draw is full</div>
      <div style={{ color: C.sub, fontSize: 14, marginTop: 4 }}>All 24 slots are taken.</div>
    </Card>
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {phase === "intro" && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Lucky dip</div>
          <div style={{ color: C.sub, fontSize: 13, marginBottom: 14 }}>Two teams, drawn at random by the system. One go each — picks lock instantly and can’t be swapped.</div>
          <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Your name"
            style={{ width: "100%", padding: "13px 14px", borderRadius: 12, background: "#0c1c33", border: `1px solid ${C.line}`, color: C.text, fontSize: 15, marginBottom: 12 }} />
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <Btn full onClick={start} disabled={busy}><Dices size={18} /> {busy ? "Drawing…" : "Reveal my 2 teams"}</Btn>
        </Card>
      )}
      {phase === "reveal" && (
        <Card style={{ textAlign: "center" }}>
          <div style={{ color: C.sub, fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>TEAM {Math.min(shown + 1, 2)} OF 2 · {myName}</div>
          <div style={{ background: "#0b1a30", border: `1px solid ${C.teal}`, borderRadius: 16, padding: "26px 14px", margin: "0 auto 16px", maxWidth: 320 }}>
            <div style={{ fontSize: 58, lineHeight: 1 }}>{reel?.flag}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{reel?.name}</div>
            <div style={{ color: C.sub, fontSize: 12 }}>Group {reel?.grp}</div>
          </div>
          {shown >= 1 && <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
            {result.slice(0, shown).map((t) => <TeamChip key={t.team_id} t={{ name: t.team_name, flag: t.flag }} status="active" />)}
          </div>}
          {shown === 1 && <Btn full onClick={revealSecond}><Dices size={18} /> Reveal team 2</Btn>}
        </Card>
      )}
      {phase === "done" && (
        <Card style={{ textAlign: "center", animation: "pop .3s" }}>
          <Check size={30} color={C.teal} />
          <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>You’re in, {myName}!</div>
          <div style={{ color: C.sub, fontSize: 13, margin: "2px 0 14px" }}>Send KSh 1,000 to +254 737 600 380 to confirm your slot.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {result.map((t) => <TeamChip key={t.team_id} t={{ name: t.team_name, flag: t.flag }} status="active" />)}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- My Teams ---------- */
function MineView({ players, teamMap, statusOf, aliveCount, myName, setMyName }) {
  const me = players.find((p) => p.name.toLowerCase() === myName.trim().toLowerCase());
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Find your picks</div>
        <select value={me?.name || ""} onChange={(e) => setMyName(e.target.value)}
          style={{ width: "100%", padding: "13px 14px", borderRadius: 12, background: "#0c1c33", border: `1px solid ${C.line}`, color: C.text, fontSize: 15 }}>
          <option value="">Select your name…</option>
          {players.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </Card>
      {me && (() => {
        const alive = aliveCount(me);
        const champ = me.picks.some((id) => statusOf(id) === "champion");
        const b = champ ? { c: C.gold, t: "🏆 WINNER — you take the pot!" } : alive === 0 ? { c: C.red, t: "Out of contention" } : { c: C.teal, t: `Still in — ${alive} alive` };
        return (
          <Card style={{ borderColor: b.c + "66" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{me.name}</div>
              <span style={{ color: b.c, fontWeight: 700, fontSize: 13 }}>{b.t}</span>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {me.picks.map((id) => { const s = statusOf(id), t = teamMap[id]; return (
                <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0c1c33", border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 26 }}>{t?.flag}</span>
                    <div><div style={{ fontWeight: 700 }}>{t?.name}</div><div style={{ color: C.sub, fontSize: 12 }}>Group {t?.grp}</div></div>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: s === "out" ? C.red : s === "champion" ? C.gold : C.teal, fontWeight: 700, fontSize: 13 }}>
                    <StatusDot s={s} />{s === "out" ? "Knocked out" : s === "champion" ? "Champion" : "Still in"}
                  </span>
                </div>); })}
            </div>
            <div style={{ marginTop: 12, color: C.sub, fontSize: 12 }}>{me.paid ? "✓ Buy-in confirmed" : "Buy-in pending — send KSh 1,000 to +254 737 600 380"}</div>
          </Card>
        );
      })()}
      {me && <EnableAlerts name={me.name} />}
    </div>
  );
}

/* ---------- Standings + Results ---------- */
function StandingsView({ players, teamMap, statusOf, aliveCount, matches }) {
  const rows = [...players].sort((a, b) => {
    const ca = a.picks.some((i) => statusOf(i) === "champion") ? 1 : 0, cb = b.picks.some((i) => statusOf(i) === "champion") ? 1 : 0;
    return cb - ca || aliveCount(b) - aliveCount(a) || a.name.localeCompare(b.name);
  });
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ color: C.sub, fontSize: 13, padding: "0 2px" }}>{rows.length} players · grand prize KSh 24,000 to whoever owns the champion.</div>
      {rows.length === 0 && <Card style={{ color: C.sub, textAlign: "center" }}>No one has drawn yet.</Card>}
      {rows.map((p) => { const alive = aliveCount(p), champ = p.picks.some((i) => statusOf(i) === "champion"); return (
        <Card key={p.id} style={{ padding: 13, borderColor: champ ? C.gold : (alive === 0 ? C.red + "55" : C.line) }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>{champ && <Trophy size={15} color={C.gold} />}{p.name}{p.paid && <Check size={13} color={C.teal} />}</div>
            <span style={{ color: alive === 0 ? C.red : C.teal, fontSize: 12, fontWeight: 700 }}>{alive === 0 ? "OUT" : `${alive} alive`}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{p.picks.map((id) => teamMap[id] && <TeamChip key={id} t={teamMap[id]} status={statusOf(id)} small />)}</div>
        </Card>
      ); })}

      {matches.length > 0 && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 10 }}><Clock size={15} color={C.sub} /> Recent results</div>
          <div style={{ display: "grid", gap: 7 }}>
            {matches.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub }}>
                <span style={{ color: C.text }}>{m.home} {m.home_score}–{m.away_score} {m.away}</span>
                <span style={{ fontSize: 11 }}>{stageLabel(m.stage)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
const stageLabel = (s) => ({ GROUP_STAGE: "Group", LAST_32: "R32", LAST_16: "R16", QUARTER_FINALS: "QF", SEMI_FINALS: "SF", THIRD_PLACE: "3rd", FINAL: "Final" }[s] || s);

/* ---------- Teams by group ---------- */
function TeamsView({ teams, players, statusOf, config }) {
  const ownerOf = (id) => players.find((p) => p.picks.includes(id));
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ color: C.sub, fontSize: 13, padding: "0 2px" }}>Live status of all 48 teams.{config?.last_sync ? ` Synced ${new Date(config.last_sync).toLocaleString()}.` : ""}</div>
      {GROUPS.map((g) => (
        <Card key={g} style={{ padding: 12 }}>
          <div style={{ fontWeight: 800, color: C.teal, fontSize: 13, marginBottom: 8 }}>GROUP {g}</div>
          <div style={{ display: "grid", gap: 6 }}>
            {teams.filter((t) => t.grp === g).map((t) => { const s = statusOf(t.id), o = ownerOf(t.id); return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0c1c33", border: `1px solid ${s === "out" ? C.red + "44" : s === "champion" ? C.gold : C.line}`, borderRadius: 10, padding: "9px 11px", opacity: s === "out" ? 0.6 : 1 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 9 }}><StatusDot s={s} /><span style={{ fontSize: 19 }}>{t.flag}</span><span style={{ fontWeight: 600, fontSize: 14, textDecoration: s === "out" ? "line-through" : "none" }}>{t.name}</span></span>
                <span style={{ color: o ? C.teal : C.sub, fontSize: 12, fontWeight: 600 }}>{o ? o.name : "—"}</span>
              </div>); })}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------- Admin ---------- */
function AdminView({ teams, players, statusOf, teamMap, config, matches, onDone }) {
  const [pin, setPin] = useState(""); const [ok, setOk] = useState(false); const [copied, setCopied] = useState(false); const [err, setErr] = useState("");
  const call = async (fn, args) => { const { error } = await supabase.rpc(fn, args); if (error) setErr(error.message); else { setErr(""); onDone(); } };

  function update() {
    const out = teams.filter((t) => statusOf(t.id) === "out");
    const aliveP = players.filter((p) => p.picks.some((i) => statusOf(i) !== "out"));
    const dead = players.filter((p) => p.picks.every((i) => statusOf(i) === "out"));
    const champTeam = config?.champion_team_id ? teamMap[config.champion_team_id] : null;
    const champWinner = champTeam ? players.find((p) => p.picks.includes(config.champion_team_id)) : null;
    const L = ["⚽ World Cup 2026 — Pool Update", ""];
    if (champWinner) L.push(`🏆 WINNER: ${champWinner.name} (${champTeam.flag} ${champTeam.name}) takes KSh 24,000!`, "");
    L.push(`Teams still in: ${48 - out.length}/48`);
    if (out.length) L.push(`Out: ${out.map((t) => t.name).join(", ")}`);
    L.push("", `Still alive (${aliveP.length}): ${aliveP.map((p) => p.name).join(", ") || "—"}`);
    if (dead.length) L.push(`Knocked out: ${dead.map((p) => p.name).join(", ")}`);
    return L.join("\n");
  }

  if (!ok) return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 4 }}><ShieldCheck size={18} color={C.teal} /> Admin access</div>
      <div style={{ color: C.sub, fontSize: 13, marginBottom: 12 }}>Organiser only. Default PIN 2026 — change it below once in.</div>
      <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" placeholder="PIN" style={{ width: "100%", padding: "13px 14px", borderRadius: 12, background: "#0c1c33", border: `1px solid ${C.line}`, color: C.text, fontSize: 15, marginBottom: 12 }} />
      <Btn full onClick={() => setOk(true)}>Unlock</Btn>
    </Card>
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {err && <Card style={{ borderColor: C.red, color: C.red, fontSize: 13 }}>{err}</Card>}
      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>WhatsApp update</div>
        <pre style={{ whiteSpace: "pre-wrap", background: "#0c1c33", border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, fontSize: 12.5, color: C.text, margin: "0 0 10px", fontFamily: "Montserrat" }}>{update()}</pre>
        <Btn full kind={copied ? "primary" : "ghost"} onClick={() => navigator.clipboard?.writeText(update()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy for WhatsApp</>}</Btn>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Champion (auto-set from the final; override here)</div>
        <select value={config?.champion_team_id || ""} onChange={(e) => call("admin_set_champion", { p_pin: pin, p_team: e.target.value })}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: "#0c1c33", border: `1px solid ${C.line}`, color: C.text, fontSize: 15 }}>
          <option value="">— not decided —</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
        </select>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Manual In / Out override</div>
        <div style={{ color: C.sub, fontSize: 12, marginBottom: 10 }}>The sync sets these automatically. Use only if the feed lags.</div>
        <div style={{ display: "grid", gap: 6, maxHeight: 240, overflow: "auto" }}>
          {teams.map((t) => { const s = statusOf(t.id); return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0c1c33", border: `1px solid ${C.line}`, borderRadius: 10, padding: "7px 11px" }}>
              <span style={{ fontSize: 13 }}>{t.flag} {t.name}</span>
              <button onClick={() => call("admin_set_status", { p_pin: pin, p_team: t.id, p_status: s === "out" ? "active" : "out" })}
                style={{ border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: s === "out" ? C.red : C.teal, color: "#04161a" }}>{s === "out" ? "Out" : "In"}</button>
            </div>); })}
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Players & buy-ins ({players.length})</div>
        <div style={{ display: "grid", gap: 6 }}>
          {players.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0c1c33", border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 11px" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => call("admin_set_paid", { p_pin: pin, p_pid: p.id, p_paid: !p.paid })} style={{ cursor: "pointer", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, background: p.paid ? C.teal : "#1a2c47", color: p.paid ? "#04161a" : C.sub }}>{p.paid ? "Paid" : "Mark paid"}</button>
                <button onClick={() => window.confirm("Remove player?") && call("admin_remove_player", { p_pin: pin, p_pid: p.id })} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer" }}><X size={16} /></button>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Settings</div>
        <PinChanger pin={pin} call={call} />
        <div style={{ marginTop: 12 }}><Btn kind="red" full onClick={() => window.confirm("Wipe all players & reset statuses?") && call("admin_reset", { p_pin: pin })}>Full reset</Btn></div>
      </Card>
    </div>
  );
}
function PinChanger({ pin, call }) {
  const [v, setV] = useState(""); const [done, setDone] = useState(false);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="New admin PIN" style={{ flex: 1, padding: "11px 12px", borderRadius: 10, background: "#0c1c33", border: `1px solid ${C.line}`, color: C.text, fontSize: 14 }} />
      <Btn kind="ghost" onClick={async () => { if (v.trim()) { await call("admin_set_pin", { p_pin: pin, p_new: v.trim() }); setDone(true); setV(""); setTimeout(() => setDone(false), 1500); } }}>{done ? <Check size={16} /> : "Save"}</Btn>
    </div>
  );
}
