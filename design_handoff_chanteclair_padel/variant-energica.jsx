// Variant 3 — IPER-ENERGICA
// Full-bleed, diagonals, big condensed type, yellow on night.
// Closer in spirit to the poster but cleaned up for web.

const VariantEnergica = ({ photoMode = "fullbleed" }) => {
  return (
    <div className="cc-root v3-root" style={{
      background: "var(--night-deep)",
      color: "var(--paper)",
      minHeight: "100%",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top marquee */}
      <div className="cc-ticker fast" style={{
        padding: "10px 0",
        background: "var(--yellow)",
        color: "var(--night-deep)",
        fontFamily: "var(--display)",
        fontSize: 22,
        letterSpacing: "0.04em",
      }}>
        <div>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{ paddingRight: 28 }}>
              ★ Iscrizioni aperte · 13.06.2026 · Sant'Agata Bolognese ·&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <header style={{
        padding: "20px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        zIndex: 5,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="cc-logo"><span>C</span></span>
          <div className="cc-display" style={{ fontSize: 24 }}>Chanteclair</div>
        </div>
        <nav style={{ display: "flex", gap: 24, fontSize: 14 }}>
          {["Tornei", "Premi", "Programma", "Tabelloni"].map(l => (
            <a key={l} style={{ textDecoration: "none", color: "var(--paper)" }}>{l}</a>
          ))}
        </nav>
        <a className="cc-btn cc-btn-primary">Iscriviti ora →</a>
      </header>

      {/* HERO — diagonals + huge type */}
      <section style={{
        position: "relative",
        padding: "30px 40px 60px",
        minHeight: 720,
      }}>
        {/* Background diagonal stripes */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(115deg, transparent 0 80px, oklch(0.18 0.04 255) 80px 81px)",
          pointerEvents: "none",
          opacity: 0.6,
        }} />

        {/* Big yellow slash */}
        <div style={{
          position: "absolute",
          left: "-10%", top: "30%",
          width: "120%",
          height: 180,
          background: "var(--yellow)",
          transform: "rotate(-6deg)",
          zIndex: 1,
        }} />

        {/* Hero stack */}
        <div style={{ position: "relative", zIndex: 3 }}>
          <div className="cc-mono" style={{
            color: "var(--paper)",
            background: "var(--red)",
            display: "inline-block",
            padding: "6px 12px",
            marginBottom: 18,
          }}>
            ◆ Sabato 13 Giugno 2026 · Open Padel S.A.B.
          </div>

          <h1 style={{ margin: 0, position: "relative" }}>
            <div className="cc-display" style={{
              fontSize: "clamp(120px, 17vw, 260px)",
              lineHeight: 0.84,
              color: "var(--paper)",
              textShadow: "0 6px 0 oklch(0.14 0.04 255)",
            }}>
              Chanteclair
            </div>
            <div className="cc-display" style={{
              fontSize: "clamp(180px, 26vw, 400px)",
              lineHeight: 0.82,
              color: "var(--night-deep)",
              marginTop: -10,
              WebkitTextStroke: "0px var(--yellow)",
            }}>
              Padel Cup
            </div>
          </h1>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: 40,
            alignItems: "end",
            marginTop: 50,
          }}>
            <div style={{
              fontFamily: "var(--display)",
              fontSize: 44,
              lineHeight: 1,
              color: "var(--yellow)",
              maxWidth: 560,
            }}>
              Due tornei,<br />
              <span style={{ color: "var(--paper)" }}>un'unica grande</span>
              <br />
              giornata di sport.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <a className="cc-btn cc-btn-primary" style={{ fontSize: 22, padding: "18px 28px 14px" }}>Iscrivi la coppia →</a>
              <a className="cc-btn cc-btn-ghost" style={{ color: "var(--paper)", fontSize: 22, padding: "16.5px 28px 12.5px" }}>Programma</a>
            </div>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section style={{
        background: "var(--paper)",
        color: "var(--night-deep)",
        padding: "32px 40px",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 0,
        position: "relative",
      }}>
        {[
          { v: "64", l: "Coppie iscritte" },
          { v: "8", l: "Campi attivi" },
          { v: "12h", l: "Di sport non-stop" },
          { v: "2K€", l: "Montepremi totale" },
        ].map((s, i) => (
          <div key={i} style={{
            textAlign: "center",
            borderLeft: i > 0 ? "1px solid var(--line)" : "none",
            padding: "0 20px",
          }}>
            <div className="cc-display cc-num" style={{ fontSize: 96, lineHeight: 0.9 }}>{s.v}</div>
            <div className="cc-mono" style={{ marginTop: 6, color: "oklch(0.45 0.02 255)" }}>{s.l}</div>
          </div>
        ))}
      </section>

      {/* I due tornei — diagonal split */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        position: "relative",
      }}>
        {[
          { tag: "M", title: "Maschile", bg: "var(--blue)", img: "Azione · M" },
          { tag: "F", title: "Femminile", bg: "var(--pink)", img: "Azione · F" },
        ].map((t, i) => (
          <div key={i} style={{
            background: t.bg,
            color: "var(--paper)",
            padding: "60px 40px",
            position: "relative",
            overflow: "hidden",
            minHeight: 420,
          }}>
            <div className="cc-mono" style={{ marginBottom: 8 }}>Torneo · {String(i + 1).padStart(2, "0")} / 02</div>
            <div className="cc-display" style={{
              fontSize: 220,
              lineHeight: 0.84,
              letterSpacing: "-0.01em",
            }}>{t.title}</div>
            <div style={{
              fontFamily: "var(--display)",
              fontSize: 32,
              marginTop: 24,
              opacity: 0.95,
            }}>32 coppie · Tabellone live</div>
            <a className="cc-btn cc-btn-primary" style={{ marginTop: 28 }}>
              Iscrivi → 
            </a>
            <div className="cc-display" style={{
              position: "absolute",
              right: -30, bottom: -100,
              fontSize: 520,
              lineHeight: 1,
              color: "rgba(255,255,255,0.10)",
              pointerEvents: "none",
            }}>{t.tag}</div>
          </div>
        ))}
      </section>

      {/* Bottom CTA strip */}
      <section style={{
        padding: "60px 40px",
        textAlign: "center",
        background: "var(--night-deep)",
      }}>
        <div className="cc-mono" style={{ color: "var(--yellow)", marginBottom: 12 }}>
          ◆ Le iscrizioni chiudono il 5 giugno
        </div>
        <div className="cc-display" style={{
          fontSize: "clamp(80px, 12vw, 180px)",
          lineHeight: 0.9,
          color: "var(--yellow)",
        }}>
          Pronto a<br />giocare?
        </div>
        <a className="cc-btn cc-btn-primary" style={{
          fontSize: 28,
          padding: "20px 36px 16px",
          marginTop: 30,
        }}>
          Iscriviti adesso →
        </a>
      </section>

      <div className="cc-ticker fast" style={{
        padding: "10px 0",
        background: "var(--yellow)",
        color: "var(--night-deep)",
        fontFamily: "var(--display)",
        fontSize: 22,
      }}>
        <div>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{ paddingRight: 28 }}>
              ★ Sport · Divertimento · Musica · 13.06.2026 ·&nbsp;
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

window.VariantEnergica = VariantEnergica;
