import { useState } from "react";
import { MemoryGame } from "../components/MemoryGame";

interface HomePageProps {
  onRedeem?: () => void;
}

export function HomePage({ onRedeem }: HomePageProps) {
  const [showGame, setShowGame] = useState(false);

  return (
    <main
      style={{
        maxWidth: 1040,
        margin: "0 auto",
        padding: "2.25rem 2rem",
        display: "flex",
        flexDirection: "column",
        minHeight: "80vh",
      }}
    >
      <section
        style={{
          marginBottom: showGame ? "1.5rem" : "2.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.9rem",
            minWidth: 0,
            marginBottom: "0.75rem",
          }}
        >
          <img
            src="/images/logo-cacau-show.png"
            alt="Logo Cacau Show"
            style={{ height: 56, objectFit: "contain" }}
          />
          <div>
            <div
              style={{
                fontSize: "0.8rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#8a5a35",
                marginBottom: "0.25rem",
              }}
            >
              Desafio exclusivo
            </div>
            <div style={{ fontWeight: 600, fontSize: "1.05rem", color: "#3b2414" }}>
              Ganhe desconto especial completando o jogo da memória.
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 460 }}>
          <h1 style={{ margin: 0, marginBottom: "0.75rem" }}>
            Desafio de Memória Cacau Show
          </h1>
          <p style={{ margin: 0 }}>
            Encontre todos os pares de produtos para desbloquear seu{" "}
            <strong>cupom de desconto exclusivo</strong>.
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "#8a5a35" }}>
            Oferta por tempo limitado e com quantidade de cupons diária reduzida.
          </p>
          {!showGame && (
            <button
              onClick={() => setShowGame(true)}
              style={{
                marginTop: "2rem",
                padding: "0.85rem 1.8rem",
                fontSize: "0.98rem",
                borderRadius: 999,
                border: "1px solid #c89d5a",
                background:
                  "linear-gradient(135deg, #7b3f24 0%, #5a2a1b 40%, #c89d5a 100%)",
                color: "#fffef8",
                cursor: "pointer",
                boxShadow: "0 6px 14px rgba(0, 0, 0, 0.22)",
              }}
              className="cta-pulse-button"
            >
              Começar desafio
            </button>
          )}
        </div>
      </section>

      {showGame && (
        <section style={{ marginTop: "0.5rem" }}>
          <MemoryGame onRedeem={onRedeem} />
        </section>
      )}
    </main>
  );
}


