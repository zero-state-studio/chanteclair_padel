// Tabelloni — fullscreen layout (no page scroll)
// - Bracket SEMPRE completamente visibile (auto-scale to fit)
// - Default focus on live matches: highlighted on the bracket + dedicated strip on top
// - Style inherits Variant C (night + yellow + diagonals)

const LIVE_CODES = { M: ["M1", "M3", "M5"], F: ["F2", "F4"] };

const COUPLES = {
  M: [
    { code: "M1", a: "Rossi / Bianchi", b: "Verdi / Neri", court: "C1", score: "6-4 · 3-2", status: "live" },
    { code: "M2", a: "Conti / Esposito", b: "Russo / Romano", court: "C2", score: "6-3 · 6-1", status: "done", winner: 0 },
    { code: "M3", a: "Ferrari / Galli", b: "Marino / Greco", court: "C3", score: "5-4 · —", status: "live" },
    { code: "M4", a: "Bruno / Gallo", b: "Costa / Fontana", court: "C4", score: "—", status: "next", time: "15:30" },
    { code: "M5", a: "Ricci / Marini", b: "Rinaldi / Caruso", court: "C5", score: "2-1 · —", status: "live" },
    { code: "M6", a: "Ferri / Santoro", b: "Mancini / Longo", court: "C6", score: "—", status: "next", time: "15:45" },
    { code: "M7", a: "Leone / Martini", b: "Gentile / Serra", court: "C7", score: "—", status: "next", time: "16:00" },
    { code: "M8", a: "Vitali / Sala", b: "Riva / Conte", court: "C8", score: "—", status: "next", time: "16:15" },
  ],
  F: [
    { code: "F1", a: "Bianchi / Greco", b: "Rossi / Conti", court: "C1", score: "6-2 · 6-3", status: "done", winner: 0 },
    { code: "F2", a: "Marino / Lombardi", b: "Bruno / Caruso", court: "C2", score: "4-3 · —", status: "live" },
    { code: "F3", a: "Russo / Romano", b: "Ferrari / Galli", court: "C3", score: "—", status: "next", time: "15:30" },
    { code: "F4", a: "Esposito / Sala", b: "Riva / Vitali", court: "C4", score: "5-5 · —", status: "live" },
    { code: "F5", a: "Ricci / Mariani", b: "Sartori / Longo", court: "C5", score: "—", status: "next", time: "15:45" },
    { code: "F6", a: "Ferri / Santoro", b: "Leone / Serra", court: "C6", score: "—", status: "next", time: "16:00" },
    { code: "F7", a: "Costa / Fontana", b: "Marchi / Pini", court: "C7", score: "—", status: "next", time: "16:15" },
    { code: "F8", a: "Conte / Rinaldi", b: "Belli / Lupi", court: "C8", score: "—", status: "next", time: "16:30" },
  ],
};

const Tabelloni = () => {
  const [tab, setTab] = React.useState("M");
  const [focused, setFocused] = React.useState(null); // hovered/clicked match code
  const stageRef = React.useRef(null);
  const bracketRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);

  const accent = tab === "M" ? "var(--blue)" : "var(--pink)";
  const matches = COUPLES[tab];
  const liveCodes = matches.filter(m => m.status === "live").map(m => m.code);
  const liveMatches = matches.filter(m => m.status === "live");

  // Auto-scale bracket to fit container — measure natural size of bracket,
  // not a guessed intrinsic. Reset transform first so measurement is honest.
  React.useEffect(() => {
    const fit = () => {
      if (!stageRef.current || !bracketRef.current) return;
      const stage = stageRef.current.getBoundingClientRect();
      // Reset to measure
      bracketRef.current.style.transform = "scale(1)";
      const natW = bracketRef.current.scrollWidth;
      const natH = bracketRef.current.scrollHeight;
      const padding = 8;
      const s = Math.min(
        (stage.width - padding) / natW,
        (stage.height - padding) / natH,
        1
      );
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, [tab]);

  // Build derived rounds
  const r2 = [
    { code: "Q1", a: "Vinc. M1", b: "Vinc. M2" },
    { code: "Q2", a: "Vinc. M3", b: "Vinc. M4" },
    { code: "Q3", a: "Vinc. M5", b: "Vinc. M6" },
    { code: "Q4", a: "Vinc. M7", b: "Vinc. M8" },
  ];
  const r3 = [
    { code: "S1", a: "Vinc. Q1", b: "Vinc. Q2" },
    { code: "S2", a: "Vinc. Q3", b: "Vinc. Q4" },
  ];
  const finalM = { code: "F1", a: "Vinc. S1", b: "Vinc. S2" };

  const Match = ({ m, big }) => {
    const isLive = m.status === "live";
    const isDone = m.status === "done";
    const isFocus = focused === m.code;
    return (
      <div
        onMouseEnter={() => setFocused(m.code)}
        onMouseLeave={() => setFocused(null)}
        style={{
          background: isLive
            ? "oklch(0.30 0.05 255)"
            : isFocus
              ? "oklch(0.32 0.05 255)"
              : "oklch(0.24 0.05 255)",
          border: isLive
            ? `1.5px solid ${accent}`
            : isFocus
              ? `1.5px solid ${accent}`
              : "1px solid oklch(0.32 0.05 255)",
          padding: big ? "8px 12px" : "5px 10px",
          marginBottom: 0,
          transition: "all 0.18s ease",
          cursor: "pointer",
          position: "relative",
          opacity: isDone ? 0.65 : 1,
          boxShadow: isLive ? `0 0 0 4px oklch(0.30 0.05 255), 0 0 24px ${accent}55` : "none",
        }}
      >
        {/* tiny status dot */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}>
          <span className="cc-mono" style={{ fontSize: 9, color: "oklch(0.7 0.02 255)" }}>
            {m.code} · {m.court}
          </span>
          {isLive && (
            <span className="cc-mono" style={{
              fontSize: 9,
              color: "var(--yellow)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--yellow)",
                animation: "live-pulse 1.4s ease-in-out infinite",
              }} />
              LIVE
            </span>
          )}
          {isDone && (
            <span className="cc-mono" style={{ fontSize: 9, color: "oklch(0.7 0.18 140)" }}>✓</span>
          )}
          {m.status === "next" && (
            <span className="cc-mono" style={{ fontSize: 9, color: "oklch(0.6 0.02 255)" }}>{m.time}</span>
          )}
        </div>
        <div style={{
          fontFamily: "var(--display)",
          fontSize: big ? 18 : 13,
          color: isDone && m.winner !== 0 ? "oklch(0.55 0.02 255)" : "var(--paper)",
          lineHeight: 1.05,
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>{m.a}</div>
        <div style={{
          height: 1, background: "oklch(0.32 0.05 255)",
          margin: big ? "5px 0" : "4px 0",
        }} />
        <div style={{
          fontFamily: "var(--display)",
          fontSize: big ? 18 : 13,
          color: isDone && m.winner !== 1 ? "oklch(0.55 0.02 255)" : "var(--paper)",
          lineHeight: 1.05,
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>{m.b}</div>
        {(isLive || isDone) && (
          <div className="cc-mono cc-num" style={{
            marginTop: 5,
            fontSize: 10,
            color: isLive ? "var(--yellow)" : "oklch(0.7 0.02 255)",
            letterSpacing: "0.06em",
          }}>{m.score}</div>
        )}
      </div>
    );
  };

  return (
    <div className="cc-root" style={{
      background: "var(--night-deep)",
      color: "var(--paper)",
      height: "100vh",
      width: "100vw",
      display: "grid",
      gridTemplateRows: "auto auto auto 1fr",
      overflow: "hidden",
      position: "relative",
    }}>
      <style>{`
        @keyframes live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes glow-sweep {
          0% { opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { opacity: 0.3; }
        }
      `}</style>

      {/* Diagonal bg */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "repeating-linear-gradient(115deg, transparent 0 80px, oklch(0.18 0.04 255) 80px 81px)",
        pointerEvents: "none",
        opacity: 0.4,
      }} />

      {/* Header */}
      <header style={{
        padding: "14px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid oklch(0.3 0.04 255)",
        position: "relative",
        zIndex: 5,
        background: "oklch(0.16 0.04 255)",
      }}>
        <a href="Chanteclair Padel Cup.html" style={{
          display: "flex", alignItems: "center", gap: 12,
          textDecoration: "none", color: "var(--paper)",
        }}>
          <span className="cc-logo" style={{ width: 36, height: 36, fontSize: 18 }}><span>C</span></span>
          <div>
            <div className="cc-display" style={{ fontSize: 18, lineHeight: 1 }}>Chanteclair Padel Cup</div>
            <div className="cc-mono" style={{ fontSize: 9, color: "oklch(0.7 0.02 255)", marginTop: 2 }}>Tabelloni · 13.06.2026</div>
          </div>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, background: "oklch(0.22 0.04 255)" }}>
            {[
              { id: "M", label: "Maschile", color: "var(--blue)" },
              { id: "F", label: "Femminile", color: "var(--pink)" },
            ].map(t => (
              <button key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: tab === t.id ? t.color : "transparent",
                  border: "none",
                  padding: "10px 22px 8px",
                  fontFamily: "var(--display)",
                  fontSize: 22,
                  letterSpacing: "0.04em",
                  color: tab === t.id ? "var(--paper)" : "oklch(0.65 0.02 255)",
                  cursor: "pointer",
                  transition: "all 0.18s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "oklch(0.7 0.18 140)",
              boxShadow: "0 0 12px oklch(0.7 0.18 140)",
              animation: "live-pulse 1.4s ease-in-out infinite",
            }} />
            <span className="cc-mono" style={{ color: "oklch(0.78 0.02 255)" }}>Aggiornato in tempo reale</span>
          </div>
          <a href="Chanteclair Padel Cup.html" className="cc-mono" style={{
            color: "oklch(0.7 0.02 255)",
            textDecoration: "none",
            border: "1px solid oklch(0.32 0.05 255)",
            padding: "8px 12px",
          }}>← Home</a>
        </div>
      </header>

      {/* LIVE STRIP — first thing the eye lands on */}
      <section style={{
        padding: "14px 32px",
        background: `linear-gradient(90deg, ${accent}22, transparent 60%)`,
        borderBottom: "1px solid oklch(0.3 0.04 255)",
        position: "relative",
        zIndex: 4,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 24,
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 12, height: 12, borderRadius: "50%",
            background: "var(--yellow)",
            boxShadow: "0 0 18px var(--yellow)",
            animation: "live-pulse 1.4s ease-in-out infinite",
          }} />
          <div>
            <div className="cc-display" style={{ fontSize: 26, lineHeight: 1, color: "var(--yellow)" }}>
              In esecuzione
            </div>
            <div className="cc-mono" style={{ fontSize: 10, color: "oklch(0.78 0.02 255)" }}>
              {liveMatches.length} match · ora 14:42
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(liveMatches.length, 1)}, 1fr)`, gap: 12 }}>
          {liveMatches.map(m => (
            <button
              key={m.code}
              onMouseEnter={() => setFocused(m.code)}
              onMouseLeave={() => setFocused(null)}
              style={{
                textAlign: "left",
                background: focused === m.code ? "oklch(0.32 0.05 255)" : "oklch(0.24 0.05 255)",
                border: `1.5px solid ${accent}`,
                padding: "10px 14px",
                cursor: "pointer",
                transition: "all 0.18s",
                fontFamily: "inherit",
                color: "var(--paper)",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="cc-mono" style={{ fontSize: 9, color: "oklch(0.78 0.02 255)", marginBottom: 4 }}>
                  {m.code} · Campo {m.court.replace("C", "")}
                </div>
                <div className="cc-display" style={{ fontSize: 16, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.a}
                </div>
                <div className="cc-display" style={{ fontSize: 16, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.b}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="cc-display cc-num" style={{ fontSize: 22, color: "var(--yellow)", lineHeight: 1 }}>
                  {m.score}
                </div>
                <div className="cc-mono" style={{ fontSize: 9, color: accent, marginTop: 4 }}>● LIVE</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Round labels strip */}
      <section style={{
        padding: "10px 32px",
        borderBottom: "1px solid oklch(0.3 0.04 255)",
        position: "relative",
        zIndex: 3,
        display: "grid",
        gridTemplateColumns: "1.5fr 1.2fr 1fr 1fr",
        gap: 16,
      }}>
        {[
          { l: "Ottavi", t: "14:30 · 8 match" },
          { l: "Quarti", t: "16:00 · 4 match" },
          { l: "Semifinali", t: "17:30 · 2 match" },
          { l: "Finale", t: "19:30 · 1 match", gold: true },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="cc-display" style={{
              fontSize: 22,
              color: r.gold ? "var(--yellow)" : "var(--paper)",
            }}>{r.l}</span>
            <span className="cc-mono" style={{
              fontSize: 10,
              color: r.gold ? "var(--yellow)" : "oklch(0.7 0.02 255)",
              opacity: r.gold ? 0.9 : 1,
            }}>{r.t}</span>
          </div>
        ))}
      </section>

      {/* BRACKET STAGE — fills remaining viewport, auto-scaled */}
      <section
        ref={stageRef}
        style={{
          position: "relative",
          zIndex: 2,
          padding: "12px 32px 18px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
        }}
      >
        <div
          ref={bracketRef}
          style={{
            width: 1280,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            display: "grid",
            gridTemplateColumns: "1.5fr 1.2fr 1fr 1fr",
            gap: 16,
          }}
        >
          {/* R1 — Ottavi (8 matches stacked) */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            {matches.map((m) => <Match key={m.code} m={m} />)}
          </div>

          {/* R2 — Quarti */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            gap: 4,
          }}>
            {r2.map(m => (
              <Match key={m.code} m={{ ...m, status: "pending", court: "—" }} big />
            ))}
          </div>

          {/* R3 — Semifinali */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            gap: 4,
          }}>
            {r3.map(m => (
              <Match key={m.code} m={{ ...m, status: "pending", court: "—" }} big />
            ))}
          </div>

          {/* Final */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
              padding: 4,
              background: `linear-gradient(135deg, ${accent}, var(--yellow))`,
              width: "100%",
            }}>
              <div style={{ background: "oklch(0.20 0.04 255)", padding: 14 }}>
                <div className="cc-mono" style={{
                  color: "var(--yellow)",
                  marginBottom: 6,
                  textAlign: "center",
                  fontSize: 10,
                }}>★ FINALE</div>
                <Match m={{ ...finalM, status: "pending", court: "Centrale" }} big />
                <div className="cc-display" style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: "var(--yellow)",
                  textAlign: "center",
                  letterSpacing: "0.05em",
                }}>
                  Trofeo Chanteclair
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

window.Tabelloni = Tabelloni;
