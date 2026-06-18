import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Dices, User, Trophy, Settings, RefreshCw, Copy, Check, Lock, Users, Coins,
  ShieldCheck, X, CalendarDays, Radio, Bell, ChevronRight,
} from "lucide-react";
import { supabase } from "./supabaseClient.js";

const MAX = 24, BUYIN = 1000;
const GROUPS = "ABCDEFGHIJKL".split("");
const C = {
  bg: "#020817", deep: "#061a35", royal: "#0b5cff", electric: "#38bdf8",
  panel: "rgba(5,12,25,0.78)", panel2: "rgba(6,26,53,0.62)", line: "rgba(56,189,248,0.25)",
  teal: "#38bdf8", gold: "#d4af37", green: "#22c55e", red: "#ff4d4d",
  text: "#ffffff", sub: "#9fb0c8", blue: "#0b5cff",
};
const ISO = { mex:"mx", kor:"kr", rsa:"za", cze:"cz", can:"ca", bih:"ba", qat:"qa", sui:"ch", sco:"gb-sct", bra:"br", mar:"ma", hai:"ht", usa:"us", aus:"au", tur:"tr", par:"py", ger:"de", civ:"ci", ecu:"ec", cuw:"cw", swe:"se", ned:"nl", jpn:"jp", tun:"tn", bel:"be", egy:"eg", irn:"ir", nzl:"nz", esp:"es", cpv:"cv", ksa:"sa", uru:"uy", fra:"fr", sen:"sn", nor:"no", irq:"iq", arg:"ar", aut:"at", alg:"dz", jor:"jo", por:"pt", col:"co", uzb:"uz", cod:"cd", eng:"gb-eng", cro:"hr", pan:"pa", gha:"gh" };
function Flag({ id, size = 14 }) {
  const code = ISO[id];
  if (!code) return null;
  return <img src={`https://flagcdn.com/${code}.svg`} alt="" loading="lazy" style={{ width: Math.round(size * 1.5), height: size, borderRadius: 2, objectFit: "cover", display: "inline-block", verticalAlign: "middle", boxShadow: "0 0 0 1px rgba(255,255,255,.10)", flex: "0 0 auto" }} />;
}

/* ---------- helpers ---------- */
const stageLabel = (s) => ({ GROUP_STAGE: "Group Stage", LAST_32: "Round of 32", LAST_16: "Round of 16", QUARTER_FINALS: "Quarter-finals", SEMI_FINALS: "Semi-finals", THIRD_PLACE: "Third place", FINAL: "Final" }[s] || s || "");
const stageShort = (s) => ({ GROUP_STAGE: "Group", LAST_32: "R32", LAST_16: "R16", QUARTER_FINALS: "QF", SEMI_FINALS: "SF", THIRD_PLACE: "3rd", FINAL: "FINAL" }[s] || s || "");
const STAGE_ORDER = ["GROUP_STAGE", "LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];
const isLive = (m) => m.status === "IN_PLAY" || m.status === "PAUSED";
const grpLetter = (g) => (g ? String(g).replace(/[^A-L]/gi, "").toUpperCase() : "");
const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/* ---------- atoms ---------- */
const Card = ({ children, style }) => (
  <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 20, padding: 16, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", ...style }}>{children}</div>
);
function StatusDot({ s }) {
  const m = { active: C.teal, out: C.red, champion: C.gold };
  return <span style={{ width: 8, height: 8, borderRadius: 99, background: m[s], display: "inline-block" }} />;
}
function LiveDot() {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.red, fontWeight: 800, fontSize: 11, letterSpacing: 1 }}>
    <span className="livepulse" style={{ width: 7, height: 7, borderRadius: 99, background: C.red, display: "inline-block" }} />LIVE</span>;
}
function Btn({ children, onClick, kind = "primary", disabled, full }) {
  const grad = { primary: "linear-gradient(135deg,#003b8f,#0b5cff,#38bdf8)", gold: `linear-gradient(90deg,${C.gold},#b8902a)`, red: C.red, ghost: "transparent" }[kind];
  const ghost = kind === "ghost";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#1d2742" : grad,
      color: ghost ? C.text : (kind === "gold" ? "#231600" : "#fff"),
      border: ghost ? `1px solid ${C.line}` : "none", borderRadius: 12, padding: "13px 18px",
      fontWeight: 800, fontSize: 15, cursor: disabled ? "default" : "pointer", width: full ? "100%" : "auto",
      opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      letterSpacing: 0.3,
    }}>{children}</button>
  );
}
function TeamChip({ t, status, small }) {
  const col = status === "out" ? C.red : status === "champion" ? C.gold : C.teal;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: small ? "3px 8px" : "5px 10px",
      borderRadius: 8, background: "rgba(255,255,255,0.05)", border: `1px solid ${col}44`, color: C.text,
      fontSize: small ? 12 : 13, opacity: status === "out" ? 0.5 : 1,
      textDecoration: status === "out" ? "line-through" : "none", whiteSpace: "nowrap",
    }}>
      <Flag id={t.id} size={small ? 12 : 14} />{t.name}
      {status === "champion" && <Trophy size={12} color={C.gold} />}
    </span>
  );
}
function Confetti() {
  const cols = [C.gold, "#f6e7a8", "#ffffff", C.electric, C.royal];
  const bits = Array.from({ length: 36 });
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50 }}>
      {bits.map((_, i) => (
        <span key={i} className="confetti" style={{
          left: `${(i * 2.8) % 100}%`, background: cols[i % cols.length],
          animationDelay: `${(i % 12) * 0.25}s`, animationDuration: `${3 + (i % 5) * 0.6}s`,
        }} />
      ))}
    </div>
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
      if (!VAPID_KEY) { setState("err"); setMsg("Alerts aren't switched on yet."); return; }
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
      <div style={{ fontWeight: 800, marginBottom: 4 }}>Match alerts</div>
      <div style={{ color: C.sub, fontSize: 13, marginBottom: 12 }}>Get pinged on this phone when one of your teams is knocked out, and when the champion is decided.</div>
      {state === "on"
        ? <div style={{ color: C.teal, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><Check size={16} /> Alerts on for {name}</div>
        : <><Btn full onClick={enable}><Bell size={17} /> Turn on alerts</Btn>{msg && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{msg}</div>}</>}
      <div style={{ color: C.sub, fontSize: 11, marginTop: 10 }}>On iPhone: add this site to your Home Screen first, then open it from there.</div>
    </Card>
  );
}

function BgConfetti() {
  const bits = Array.from({ length: 16 });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {bits.map((_, i) => (
        <span key={i} className="confetti" style={{ left: `${(i * 6.3) % 100}%`, background: i % 3 === 0 ? "#ffffff" : "#d4af37", opacity: 0.45, animationDelay: `${(i % 8) * 1.2}s`, animationDuration: `${7 + (i % 5)}s` }} />
      ))}
    </div>
  );
}

/* ============================ APP ============================ */
export default function App() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [config, setConfig] = useState(null);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [tab, setTab] = useState("draw");
  const [myName, setMyName] = useState("");
  const reduced = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const statusOf = useCallback((id) => (config?.champion_team_id === id ? "champion" : (teamMap[id]?.status || "active")), [config, teamMap]);

  const loadAll = useCallback(async () => {
    const [{ data: t }, { data: pa }, { data: pk }, { data: cfg }, { data: mt }, { data: st }] = await Promise.all([
      supabase.from("teams").select("*").order("grp"),
      supabase.from("participants").select("*").order("created"),
      supabase.from("picks").select("*"),
      supabase.from("pool_public").select("*").single(),
      supabase.from("matches").select("*").order("utc_date"),
      supabase.from("standings").select("*").order("position"),
    ]);
    setTeams(t || []); setConfig(cfg || {}); setMatches(mt || []); setStandings(st || []);
    const byP = {};
    (pk || []).forEach((p) => { (byP[p.participant_id] ||= []).push(p.team_id); });
    setPlayers((pa || []).map((p) => ({ ...p, picks: byP[p.id] || [] })));
  }, []);

  useEffect(() => {
    loadAll();
    const ch = supabase.channel("pool").on("postgres_changes", { event: "*", schema: "public" }, () => loadAll()).subscribe();
    const iv = setInterval(loadAll, 20000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, [loadAll]);

  if (!config) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: C.sub, background: C.bg, fontFamily: "Montserrat,system-ui" }}>Loading…</div>;

  const potPaid = players.filter((p) => p.paid).length * BUYIN;
  const aliveCount = (p) => p.picks.filter((id) => statusOf(id) !== "out").length;
  const teamsIn = teams.filter((t) => t.status !== "out").length;
  const claimed = players.reduce((n, p) => n + p.picks.length, 0);
  const allDrawn = claimed >= 48;
  const liveMatches = matches.filter(isLive);
  let curStage = "GROUP_STAGE";
  for (const s of STAGE_ORDER) if (matches.some((m) => m.stage === s && m.status !== "SCHEDULED" && m.status !== "TIMED")) curStage = s;
  const championSet = !!config.champion_team_id;

  return (
    <div className="wc" style={{ background: C.bg, minHeight: "100vh", color: C.text, position: "relative" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');
        .wc,.wc *{font-family:'Montserrat',system-ui,-apple-system,sans-serif;box-sizing:border-box}
        @keyframes pop{0%{transform:scale(.92);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes livep{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
        .livepulse{animation:livep 1.1s infinite}
        @keyframes shimmer{0%{background-position:0% 50%}100%{background-position:200% 50%}}
        .herog{background-size:200% 200%;animation:shimmer 8s linear infinite alternate}
        @keyframes fall{0%{transform:translateY(-12vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:.9}}
        .confetti{position:absolute;top:-5vh;width:9px;height:14px;border-radius:2px;animation:fall linear infinite}
        @keyframes mq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}.marquee{animation:mq 32s linear infinite}`}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(180deg, rgba(2,8,23,.55) 0%, rgba(2,8,23,.74) 50%, rgba(2,8,23,.94) 100%), url('https://images.unsplash.com/photo-1745997645080-941f962f1392?q=80&w=2000&auto=format&fit=crop')", backgroundSize: "cover", backgroundPosition: "center", backgroundColor: C.bg }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(700px 420px at 8% -8%, rgba(190,215,255,.32), transparent 60%), radial-gradient(700px 420px at 92% -8%, rgba(190,215,255,.28), transparent 60%), radial-gradient(950px 360px at 50% 120%, rgba(34,197,94,.18), transparent 64%), radial-gradient(1050px 720px at 50% 44%, rgba(2,8,23,.58), transparent 70%)" }} />
      <BgConfetti />

      {championSet && !reduced.current && <Confetti />}

      <div style={{ maxWidth: 580, margin: "0 auto", padding: "0 0 96px", position: "relative", zIndex: 1 }}>
        {/* HERO */}
        <div style={{ margin: "16px 14px 0", background: "linear-gradient(135deg, rgba(6,26,53,.82), rgba(2,8,23,.72))", border: `1px solid ${C.line}`, borderRadius: 20, padding: "18px 16px 16px", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg,#f6d365,#d4af37)", display: "grid", placeItems: "center", boxShadow: "0 6px 20px rgba(212,175,55,.45)", flex: "0 0 auto" }}><Trophy size={24} color="#2a1d00" /></div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, fontWeight: 800, opacity: 0.9 }}>FIFA WORLD CUP</div>
                <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: -0.5 }}>2026</div>
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.95, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Flag id="can" size={12} /><Flag id="usa" size={12} /><Flag id="mex" size={12} /><span style={{ marginLeft: 2 }}>· Winner Takes All</span></div>
              </div>
            </div>
            <button onClick={loadAll} style={{ background: "rgba(255,255,255,.16)", border: `1px solid ${C.line}`, borderRadius: 10, padding: 9, color: "#fff", cursor: "pointer" }}><RefreshCw size={16} /></button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Stat label="SLOTS" value={`${players.length}`} sub={`/${MAX}`} />
            <Stat label={allDrawn ? "TEAMS ALIVE" : "TEAMS LEFT"} value={`${allDrawn ? teamsIn : 48 - claimed}`} sub="/48" />
            <Stat label="PRIZE KSh" value="24,000" small color={C.gold} />
            <Stat label="STAGE" value={stageShort(curStage)} small />
          </div>
          {liveMatches.length > 0 && (
            <div style={{ marginTop: 12, background: "rgba(0,0,0,.28)", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <LiveDot /><span style={{ fontSize: 13, fontWeight: 600 }}>{liveMatches.length} match{liveMatches.length > 1 ? "es" : ""} in play — tap Matches</span>
            </div>
          )}
        </div>

        <FlagMarquee teams={teams} />
        <div style={{ padding: "16px 14px 0" }}>
          {tab === "draw" && <DrawView {...{ players, teams, teamMap, myName, setMyName, reduced, onDone: loadAll }} />}
          {tab === "mine" && <MineView {...{ players, teamMap, statusOf, aliveCount, myName, setMyName }} />}
          {tab === "pool" && <PoolView {...{ players, teamMap, statusOf, aliveCount, championSet }} />}
          {tab === "matches" && <MatchesView {...{ matches, standings, teams, players, statusOf, teamMap }} />}
          {tab === "admin" && <AdminView {...{ teams, players, statusOf, teamMap, config, onDone: loadAll }} />}
        </div>
      </div>

      {/* bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 3, backgroundColor: "rgba(2,8,23,.86)", borderTop: `1px solid ${C.line}`, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
        <div style={{ maxWidth: 580, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(5,1fr)" }}>
          {[["draw", "Draw", Dices], ["mine", "My Teams", User], ["pool", "Pool", Trophy], ["matches", "Matches", CalendarDays], ["admin", "Admin", Settings]].map(([id, label, Icon]) => {
            const on = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{ background: "none", border: "none", padding: "10px 4px 12px", cursor: "pointer", color: on ? C.electric : C.sub, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}>
                <Icon size={20} />
                <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
                {id === "matches" && liveMatches.length > 0 && <span className="livepulse" style={{ position: "absolute", top: 7, right: "30%", width: 7, height: 7, borderRadius: 99, background: C.red }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function FlagMarquee({ teams }) {
  if (!teams.length) return null;
  const row = [...teams, ...teams];
  return (
    <div style={{ overflow: "hidden", padding: "9px 0", margin: "12px 14px 0", borderRadius: 14, background: C.panel, border: `1px solid ${C.line}`, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
      <div className="marquee" style={{ display: "flex", gap: 14, fontSize: 19, width: "max-content", paddingLeft: 14 }}>
        {row.map((t, i) => <Flag key={i} id={t.id} size={15} />)}
      </div>
    </div>
  );
}
function Stat({ label, value, sub, small, color }) {
  return (
    <div style={{ flex: 1, background: "rgba(6,26,53,0.6)", border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: small ? 15 : 20, fontWeight: 900, lineHeight: 1.2, color: color || C.text }}>{value}<span style={{ fontSize: 12, opacity: 0.75 }}>{sub}</span></div>
    </div>
  );
}

/* ---------- Draw (pay -> confirm -> reveal) ---------- */
function DrawView({ players, teams, teamMap, myName, setMyName, reduced, onDone }) {
  const [phase, setPhase] = useState("intro"); // intro|pending|ready|reveal|done
  const [reel, setReel] = useState(teams[0]);
  const [result, setResult] = useState([]);
  const [shown, setShown] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const me = players.find((p) => p.name.toLowerCase() === myName.trim().toLowerCase());
  const full = players.length >= MAX;
  const chips = (ids) => ids.map((id) => ({ team_id: id, team_name: teamMap[id]?.name, flag: teamMap[id]?.flag }));

  // live-advance: when the organiser confirms payment, or a draw already happened
  useEffect(() => {
    if (!me) return;
    if (me.picks.length >= 2 && phase !== "reveal" && phase !== "done") { setResult(chips(me.picks)); setShown(2); setPhase("done"); }
    else if (me.approved && me.picks.length === 0 && phase === "pending") { setPhase("ready"); }
  }, [me, phase]);

  async function cont() {
    setErr("");
    const name = myName.trim();
    if (!name) return setErr("Enter your name.");
    if (me) {
      if (me.picks.length >= 2) { setResult(chips(me.picks)); setShown(2); setPhase("done"); }
      else if (me.approved) setPhase("ready");
      else setPhase("pending");
      return;
    }
    if (full) return setErr("The pool is full — all 24 slots are taken.");
    setBusy(true);
    const { error } = await supabase.rpc("join_pool", { p_name: name });
    setBusy(false);
    if (error) {
      const m = { POOL_FULL: "The pool is full — all 24 slots are taken.", NAME_TAKEN: "That name is already on the list — enter it again to check your status.", NAME_REQUIRED: "Enter your name." };
      return setErr(m[(error.message.match(/[A-Z_]+/) || [])[0]] || "Could not join. Try again.");
    }
    setPhase("pending"); onDone();
  }
  async function reveal() {
    setErr(""); setBusy(true);
    const { data, error } = await supabase.rpc("claim_teams_approved", { p_name: myName.trim() });
    setBusy(false);
    if (error) {
      const m = { NOT_APPROVED: "Your payment hasn't been confirmed yet.", NOT_JOINED: "Join the pool first." };
      return setErr(m[(error.message.match(/[A-Z_]+/) || [])[0]] || "Could not reveal. Try again.");
    }
    setResult(data); setShown(0); setPhase("reveal"); spinTo(data[0], () => setShown(1)); onDone();
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

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {phase === "intro" && (
        <Card>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>🎟️ Join the pool</div>
          <div style={{ color: C.sub, fontSize: 13, marginBottom: 14 }}>Enter your name to reserve a slot. You pay KSh 1,000, and once the organiser confirms it, your two random teams unlock here. First come, first served — 24 slots. Already joined? Enter your name to check your status.</div>
          <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Your name"
            style={{ width: "100%", padding: "13px 14px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, color: C.text, fontSize: 15, marginBottom: 12 }} />
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <Btn full onClick={cont} disabled={busy}><ChevronRight size={18} /> {busy ? "…" : "Continue"}</Btn>
        </Card>
      )}
      {phase === "pending" && (
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36 }}>⏳</div>
          <div style={{ fontWeight: 900, fontSize: 18, marginTop: 4 }}>Slot reserved, {myName}!</div>
          <div style={{ color: C.sub, fontSize: 13.5, margin: "10px 0 14px", lineHeight: 1.55 }}>
            Now send <b style={{ color: C.gold }}>KSh 1,000</b> to <b style={{ color: C.text }}>+254&nbsp;737&nbsp;600&nbsp;380</b> via M-Pesa.<br />Once the organiser confirms your payment, your <b style={{ color: C.text }}>Reveal</b> button unlocks right here. You can close this and come back — just enter your name again.
          </div>
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <Btn full kind="ghost" onClick={onDone}><RefreshCw size={16} /> Check again</Btn>
        </Card>
      )}
      {phase === "ready" && (
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36 }}>✅</div>
          <div style={{ fontWeight: 900, fontSize: 18, marginTop: 4 }}>Payment confirmed!</div>
          <div style={{ color: C.sub, fontSize: 13, margin: "6px 0 16px" }}>Time for your lucky dip, {myName}. Two random teams, locked in instantly.</div>
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <Btn full onClick={reveal} disabled={busy}><Dices size={18} /> {busy ? "Drawing…" : "Reveal my 2 teams"}</Btn>
        </Card>
      )}
      {phase === "reveal" && (
        <Card style={{ textAlign: "center" }}>
          <div style={{ color: C.sub, fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>TEAM {Math.min(shown + 1, 2)} OF 2 · {myName}</div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: `2px solid ${C.teal}`, borderRadius: 16, padding: "26px 14px", margin: "0 auto 16px", maxWidth: 320 }}>
            <div style={{ display: "flex", justifyContent: "center" }}>{reel && <Flag id={reel.id} size={50} />}</div>
            <div style={{ fontSize: 21, fontWeight: 900, marginTop: 8 }}>{reel?.name}</div>
            <div style={{ color: C.sub, fontSize: 12 }}>Group {reel?.grp}</div>
          </div>
          {shown >= 1 && <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
            {result.slice(0, shown).map((t) => <TeamChip key={t.team_id} t={{ id: t.team_id, name: t.team_name }} status="active" />)}
          </div>}
          {shown === 1 && <Btn full onClick={revealSecond}><Dices size={18} /> Reveal team 2</Btn>}
        </Card>
      )}
      {phase === "done" && (
        <Card style={{ textAlign: "center", animation: "pop .3s" }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <div style={{ fontWeight: 900, fontSize: 18, marginTop: 2 }}>You’re in, {myName}!</div>
          <div style={{ color: C.sub, fontSize: 13, margin: "2px 0 14px" }}>Locked in — good luck! 🍀</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {result.map((t) => <TeamChip key={t.team_id} t={{ id: t.team_id, name: t.team_name }} status="active" />)}
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
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Find your picks</div>
        <select value={me?.name || ""} onChange={(e) => setMyName(e.target.value)}
          style={{ width: "100%", padding: "13px 14px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, color: C.text, fontSize: 15 }}>
          <option value="">Select your name…</option>
          {players.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </Card>
      {me && (() => {
        const alive = aliveCount(me);
        const champ = me.picks.some((id) => statusOf(id) === "champion");
        const b = champ ? { c: C.gold, t: "🏆 WINNER — you take the pot!" } : alive === 0 ? { c: C.red, t: "Out of contention" } : { c: C.teal, t: `Still in — ${alive} alive` };
        return (
          <Card style={{ borderColor: b.c + "88" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{me.name}</div>
              <span style={{ color: b.c, fontWeight: 800, fontSize: 13 }}>{b.t}</span>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {me.picks.map((id) => { const s = statusOf(id), t = teamMap[id]; return (
                <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {t && <Flag id={t.id} size={26} />}
                    <div><div style={{ fontWeight: 800 }}>{t?.name}</div><div style={{ color: C.sub, fontSize: 12 }}>Group {t?.grp}</div></div>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: s === "out" ? C.red : s === "champion" ? C.gold : C.teal, fontWeight: 800, fontSize: 13 }}>
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

/* ---------- Pool (player standings) ---------- */
function PoolView({ players, teamMap, statusOf, aliveCount, championSet }) {
  const rows = [...players].filter((p) => p.picks.length >= 2).sort((a, b) => {
    const ca = a.picks.some((i) => statusOf(i) === "champion") ? 1 : 0, cb = b.picks.some((i) => statusOf(i) === "champion") ? 1 : 0;
    return cb - ca || aliveCount(b) - aliveCount(a) || a.name.localeCompare(b.name);
  });
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ color: C.sub, fontSize: 13, padding: "0 2px" }}>{rows.length} players · grand prize <b style={{ color: C.gold }}>KSh 24,000</b> to whoever owns the champion.</div>
      {rows.length === 0 && <Card style={{ color: C.sub, textAlign: "center" }}>No one has drawn yet.</Card>}
      {rows.map((p, i) => { const alive = aliveCount(p), champ = p.picks.some((x) => statusOf(x) === "champion"); return (
        <Card key={p.id} style={{ padding: 13, borderColor: champ ? C.gold : (alive === 0 ? C.red + "66" : C.line), background: champ ? "#1c1604" : C.panel }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
              <span style={{ color: C.sub, fontSize: 12, width: 16 }}>{i + 1}</span>
              {champ && <Trophy size={15} color={C.gold} />}{p.name}{p.paid && <Check size={13} color={C.teal} />}
            </div>
            <span style={{ color: alive === 0 ? C.red : C.teal, fontSize: 12, fontWeight: 800 }}>{alive === 0 ? "OUT" : `${alive} alive`}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{p.picks.map((id) => teamMap[id] && <TeamChip key={id} t={teamMap[id]} status={statusOf(id)} small />)}</div>
        </Card>
      ); })}
    </div>
  );
}

/* ---------- Matches + Groups ---------- */
function MatchesView({ matches, standings, teams, players, statusOf, teamMap }) {
  const [sub, setSub] = useState("fixtures");
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, background: C.panel, padding: 5, borderRadius: 12, border: `1px solid ${C.line}` }}>
        {[["fixtures", "Matches"], ["groups", "Groups"]].map(([id, l]) => (
          <button key={id} onClick={() => setSub(id)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14, background: sub === id ? C.teal : "transparent", color: sub === id ? "#04161a" : C.sub }}>{l}</button>
        ))}
      </div>
      {sub === "fixtures" ? <Fixtures matches={matches} /> : <Groups standings={standings} teams={teams} players={players} statusOf={statusOf} teamMap={teamMap} />}
    </div>
  );
}
function MatchRow({ m }) {
  const live = isLive(m), done = m.status === "FINISHED";
  const hs = m.home_score, as = m.away_score;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", border: `1px solid ${live ? C.red + "66" : C.line}`, borderRadius: 10, padding: "9px 12px" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}><span>{m.home || "TBD"}</span><span style={{ color: done || live ? C.text : C.sub }}>{hs ?? ""}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14, marginTop: 2 }}><span>{m.away || "TBD"}</span><span style={{ color: done || live ? C.text : C.sub }}>{as ?? ""}</span></div>
      </div>
      <div style={{ width: 78, textAlign: "right", paddingLeft: 10 }}>
        {live ? <LiveDot /> : done ? <span style={{ color: C.sub, fontSize: 11, fontWeight: 700 }}>FT · {stageShort(m.stage)}</span> : <span style={{ color: C.sub, fontSize: 11, fontWeight: 600 }}>{fmtTime(m.utc_date)}</span>}
      </div>
    </div>
  );
}
function Fixtures({ matches }) {
  const live = matches.filter(isLive);
  const upcoming = matches.filter((m) => !isLive(m) && m.status !== "FINISHED").slice(0, 12);
  const recent = matches.filter((m) => m.status === "FINISHED").slice(-12).reverse();
  const Section = ({ title, items, badge }) => items.length === 0 ? null : (
    <Card style={{ padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13, marginBottom: 10, color: badge || C.text }}>{title}</div>
      <div style={{ display: "grid", gap: 7 }}>{items.map((m) => <MatchRow key={m.id} m={m} />)}</div>
    </Card>
  );
  if (!matches.length) return <Card style={{ color: C.sub, textAlign: "center" }}>Fixtures will appear here once the data syncs.</Card>;
  return (<>
    <Section title="🔴 LIVE NOW" items={live} badge={C.red} />
    <Section title="⏱ UPCOMING" items={upcoming} />
    <Section title="✓ RECENT RESULTS" items={recent} />
  </>);
}
function Groups({ standings, teams, players, statusOf, teamMap }) {
  const ownerOf = (id) => players.find((p) => p.picks.includes(id));
  const stBy = {}; standings.forEach((s) => { if (s.team_id) stBy[s.team_id] = s; });
  const hasStats = standings.length > 0;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {GROUPS.map((g) => {
        const gt = teams.filter((t) => t.grp === g);
        const ordered = hasStats ? [...gt].sort((a, b) => ((stBy[a.id]?.position ?? 9) - (stBy[b.id]?.position ?? 9))) : gt;
        return (
          <Card key={g} style={{ padding: 12 }}>
            <div style={{ fontWeight: 900, color: C.teal, fontSize: 13, marginBottom: 8 }}>GROUP {g}</div>
            {hasStats && (
              <div style={{ display: "flex", color: C.sub, fontSize: 10, fontWeight: 700, padding: "0 4px 6px", letterSpacing: 0.5 }}>
                <span style={{ width: 18 }}>#</span><span style={{ flex: 1 }}>TEAM</span><span style={{ width: 26, textAlign: "center" }}>P</span><span style={{ width: 30, textAlign: "center" }}>GD</span><span style={{ width: 30, textAlign: "center" }}>PTS</span>
              </div>
            )}
            <div style={{ display: "grid", gap: 5 }}>
              {ordered.map((t, i) => {
                const s = stBy[t.id]; const st = statusOf(t.id); const owner = ownerOf(t.id);
                const qual = hasStats && s && s.position <= 2;
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: `1px solid ${qual ? C.green + "66" : C.line}`, borderRadius: 9, padding: "8px 4px 8px 0", opacity: st === "out" ? 0.5 : 1 }}>
                    <span style={{ width: 18, textAlign: "center", color: qual ? C.green : C.sub, fontSize: 12, fontWeight: 800 }}>{hasStats ? (s?.position ?? "") : i + 1}</span>
                    <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <Flag id={t.id} size={15} />
                      <span style={{ fontWeight: 700, fontSize: 13, textDecoration: st === "out" ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                      {owner && <span style={{ color: C.teal, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>· {owner.name}</span>}
                    </span>
                    {hasStats && <>
                      <span style={{ width: 26, textAlign: "center", color: C.sub, fontSize: 12 }}>{s?.played ?? 0}</span>
                      <span style={{ width: 30, textAlign: "center", color: C.sub, fontSize: 12 }}>{s ? (s.gd > 0 ? "+" + s.gd : s.gd) : 0}</span>
                      <span style={{ width: 30, textAlign: "center", fontWeight: 800, fontSize: 13 }}>{s?.points ?? 0}</span>
                    </>}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------- Admin ---------- */
function AdminView({ teams, players, statusOf, teamMap, config, onDone }) {
  const [pin, setPin] = useState(""); const [ok, setOk] = useState(false); const [copied, setCopied] = useState(false); const [err, setErr] = useState(""); const [pinErr, setPinErr] = useState("");
  async function unlock() { const { data, error } = await supabase.rpc("admin_check_pin", { p_pin: pin }); if (!error && data === true) { setErr(""); setOk(true); } else setPinErr("Wrong PIN — try again."); }
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, marginBottom: 4 }}><ShieldCheck size={18} color={C.teal} /> Admin access</div>
      <div style={{ color: C.sub, fontSize: 13, marginBottom: 12 }}>Organiser only. Change the default PIN once in.</div>
      <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" placeholder="PIN" style={{ width: "100%", padding: "13px 14px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, color: C.text, fontSize: 15, marginBottom: 12 }} />
      {pinErr && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{pinErr}</div>}
      <Btn full onClick={unlock}>Unlock</Btn>
    </Card>
  );
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {err && <Card style={{ borderColor: C.red, color: C.red, fontSize: 13 }}>{err}</Card>}
      <Card>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>WhatsApp update</div>
        <pre style={{ whiteSpace: "pre-wrap", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, fontSize: 12.5, color: C.text, margin: "0 0 10px", fontFamily: "Montserrat" }}>{update()}</pre>
        <Btn full kind={copied ? "primary" : "ghost"} onClick={() => navigator.clipboard?.writeText(update()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy for WhatsApp</>}</Btn>
      </Card>
      <Card>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Champion (auto-set from the final; override here)</div>
        <select value={config?.champion_team_id || ""} onChange={(e) => call("admin_set_champion", { p_pin: pin, p_team: e.target.value })}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, color: C.text, fontSize: 15 }}>
          <option value="">— not decided —</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Card>
      <Card>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>Manual In / Out override</div>
        <div style={{ color: C.sub, fontSize: 12, marginBottom: 10 }}>The sync sets these automatically. Use only if the feed lags.</div>
        <div style={{ display: "grid", gap: 6, maxHeight: 240, overflow: "auto" }}>
          {teams.map((t) => { const s = statusOf(t.id); return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, borderRadius: 10, padding: "7px 11px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><Flag id={t.id} size={13} /> {t.name}</span>
              <button onClick={() => call("admin_set_status", { p_pin: pin, p_team: t.id, p_status: s === "out" ? "active" : "out" })}
                style={{ border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 800, cursor: "pointer", background: s === "out" ? C.red : C.teal, color: "#04161a" }}>{s === "out" ? "Out" : "In"}</button>
            </div>); })}
        </div>
      </Card>
      <Card>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>Players & payments ({players.length})</div>
        <div style={{ color: C.sub, fontSize: 12, marginBottom: 10 }}>Tap <b style={{ color: C.teal }}>Confirm payment</b> once their KSh 1,000 lands. That unlocks their reveal.</div>
        <div style={{ display: "grid", gap: 6 }}>
          {players.length === 0 && <div style={{ color: C.sub, fontSize: 13 }}>No one has joined yet.</div>}
          {players.map((p) => {
            const drawn = p.picks.length >= 2;
            const sub = !p.approved ? "Awaiting payment" : drawn ? "Paid · drawn" : "Paid · not drawn yet";
            const subc = !p.approved ? C.red : C.teal;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 11px" }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                  <span style={{ display: "block", color: subc, fontSize: 11, fontWeight: 600 }}>{sub}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {!p.approved
                    ? <button onClick={() => call("admin_approve", { p_pin: pin, p_pid: p.id, p_val: true })} style={{ cursor: "pointer", border: "none", borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 800, background: C.teal, color: "#04161a" }}>Confirm payment</button>
                    : <button onClick={() => window.confirm("Mark this player as unpaid?") && call("admin_approve", { p_pin: pin, p_pid: p.id, p_val: false })} style={{ cursor: "pointer", border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, background: "transparent", color: C.sub }}>✓ Paid</button>}
                  <button onClick={() => window.confirm("Remove this player and free their slot/teams?") && call("admin_remove_player", { p_pin: pin, p_pid: p.id })} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer" }}><X size={16} /></button>
                </span>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Settings</div>
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
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="New admin PIN" style={{ flex: 1, padding: "11px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, color: C.text, fontSize: 14 }} />
      <Btn kind="ghost" onClick={async () => { if (v.trim()) { await call("admin_set_pin", { p_pin: pin, p_new: v.trim() }); setDone(true); setV(""); setTimeout(() => setDone(false), 1500); } }}>{done ? <Check size={16} /> : "Save"}</Btn>
    </div>
  );
}
