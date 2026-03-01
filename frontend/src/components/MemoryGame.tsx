import { useEffect, useState } from "react";
import type { Product } from "../types/Product";

interface Card {
  id: string;
  productId: string;
  imageUrl: string;
  hiddenImageUrl: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const RECOMMENDED_TIME_SECONDS = 90;

interface MemoryGameProps {
  onRedeem?: () => void;
}

export function MemoryGame({ onRedeem }: MemoryGameProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [firstCard, setFirstCard] = useState<Card | null>(null);
  const [secondCard, setSecondCard] = useState<Card | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [moves, setMoves] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(RECOMMENDED_TIME_SECONDS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGame();
  }, []);

  async function loadGame() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/products`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const products: Product[] = await res.json();

      const duplicated = products.flatMap((p) => [
        {
          id: `${p.id}-a`,
          productId: p.id,
          imageUrl: p.imageUrl,
          hiddenImageUrl: p.hiddenImageUrl ?? p.imageUrl,
          name: p.name,
          isFlipped: false,
          isMatched: false,
        },
        {
          id: `${p.id}-b`,
          productId: p.id,
          imageUrl: p.imageUrl,
          hiddenImageUrl: p.hiddenImageUrl ?? p.imageUrl,
          name: p.name,
          isFlipped: false,
          isMatched: false,
        },
      ]);

      const shuffled = duplicated
        .map((c) => ({ c, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map((x) => x.c);

      setCards(shuffled);
      setFirstCard(null);
      setSecondCard(null);
      setMoves(0);
      setHasWon(false);
      setTimeLeft(RECOMMENDED_TIME_SECONDS);
      setLoading(false);
    } catch (err: any) {
      console.error("Erro ao carregar produtos", err);
      setError(err?.message || "Erro ao carregar produtos");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasWon || loading) return;

    const timerId = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [hasWon, loading]);

  function handleCardClick(card: Card) {
    if (isChecking || card.isFlipped || card.isMatched || hasWon) return;

    const flippedCard = { ...card, isFlipped: true };
    const newCards = cards.map((c) => (c.id === card.id ? flippedCard : c));
    setCards(newCards);

    if (!firstCard) {
      setFirstCard(flippedCard);
      return;
    }

    if (!secondCard) {
      setSecondCard(flippedCard);
      setIsChecking(true);
      setMoves((m) => m + 1);

      setTimeout(() => {
        checkMatch(flippedCard);
      }, 800);
    }
  }

  function checkMatch(currentSecond: Card) {
    if (!firstCard) return;

    let updatedCards = [...cards];

    if (firstCard.productId === currentSecond.productId) {
      updatedCards = updatedCards.map((c) =>
        c.productId === firstCard.productId ? { ...c, isMatched: true } : c
      );
    } else {
      updatedCards = updatedCards.map((c) =>
        c.id === firstCard.id || c.id === currentSecond.id
          ? { ...c, isFlipped: false }
          : c
      );
    }

    setCards(updatedCards);
    setFirstCard(null);
    setSecondCard(null);
    setIsChecking(false);

    const allMatched = updatedCards.every((c) => c.isMatched);
    if (allMatched) {
      setHasWon(true);
    }
  }

  function formatTime(seconds: number) {
    const clamped = Math.max(seconds, 0);
    const minutes = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  const canRetry = true;

  if (loading) {
    return (
      <div style={{ padding: "1rem", color: "#5b3a23" }}>
        Carregando produtos...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "1rem", color: "#b53b1a" }}>
        <div>Erro: {error}</div>
        <div style={{ marginTop: 8 }}>
          <button
            onClick={loadGame}
            style={{ padding: "0.4rem 0.9rem", borderRadius: 8, cursor: "pointer" }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
          fontSize: "0.9rem",
          color: "#5b3a23",
        }}
      >
        <span>
          Jogadas: <strong>{moves}</strong>
        </span>
        <span>
          Tempo recomendado:{" "}
          <strong>{formatTime(timeLeft)}</strong>
        </span>
        {hasWon ? (
          <span style={{ color: "#2f7a3b", fontWeight: 600 }}>
            Desafio concluído! Você ganhou!
          </span>
        ) : (
          <span
            style={{
              color: timeLeft <= 15 ? "#b53b1a" : "#8a5a35",
              fontWeight: 500,
            }}
          >
            {timeLeft > 15
              ? "Corra! Cupons de desconto são limitados."
              : "Últimos segundos para garantir o seu cupom!"}
          </span>
        )}
      </div>

      <div className="memory-grid">
        {cards.map((card, i) => {
          const layoutClass = (() => {
            const largeIndices = new Set([1, 6]);
            const wideIndices = new Set([3]);
            if (largeIndices.has(i)) return "memory-card--large";
            if (wideIndices.has(i)) return "memory-card--wide";
            return "";
          })();

          return (
            <button
              key={card.id}
              className={`memory-card ${layoutClass}`}
              onClick={() => handleCardClick(card)}
              style={{
                position: "relative",
                padding: 0,
                borderRadius: "0.8rem",
                overflow: "hidden",
                border: "1px solid #ead9c5",
                height: "100%",
                cursor: card.isMatched ? "default" : "pointer",
                backgroundColor: "#ffffff",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.06)",
              }}
            >
              {card.isFlipped || card.isMatched ? (
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={card.hiddenImageUrl}
                    alt={card.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "blur(6px) brightness(0.85)",
                      transform: "scale(1.05)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.35), rgba(250,242,230,0.75))",
                      color: "#5a2a1b",
                      fontWeight: 600,
                      fontSize: "0.76rem",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span style={{ marginBottom: 4 }}>Clique para revelar</span>
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "999px",
                        border: "1px solid rgba(90,42,27,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                      }}
                    >
                      ?
                    </span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {hasWon && (
        <>
          <div
            onClick={() => setHasWon(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 40,
            }}
            aria-hidden
          />

          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "#fff",
              padding: "1.5rem",
              borderRadius: 12,
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
              zIndex: 50,
              maxWidth: 420,
              width: "90%",
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: 0, marginBottom: 8, color: "#2f7a3b" }}>Você ganhou!</h2>
            <p style={{ margin: 0, marginBottom: 12, color: "#5b3a23" }}>
              Parabéns — ofertas exclusivas desbloqueadas.
            </p>

            <img
              src="https://cestascampinas.com.br/wp-content/uploads/2025/04/dia-maes-campinas-1-jpg.webp"
              alt="Prévia do prêmio"
              style={{
                width: "100%",
                maxHeight: 160,
                objectFit: "cover",
                borderRadius: 8,
                marginBottom: 14,
              }}
            />

            <button
              onClick={() => {
                if (onRedeem) {
                  onRedeem();
                } else {
                  window.open("https://www.cacaushow.com.br", "_blank");
                }
                setHasWon(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "0.75rem 1.1rem",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(90deg,#7b3f24,#c89d5a)",
                color: "#fffef8",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                animation: "pulse 1400ms infinite",
              }}
            >
              <span>Resgatar Ofertas</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
                <path d="M12 12v9" />
                <path d="M7 7c1.5-2 4-2 5 0s3.5 2 5 0" />
                <path d="M12 3v4" />
              </svg>
            </button>
          </div>

          <style>{`
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.035); }
              100% { transform: scale(1); }
            }
          `}</style>
        </>
      )}

      {canRetry && (
        <div style={{ marginTop: "1.5rem" }}>
          <button
            onClick={loadGame}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 999,
              border: "1px solid #6b2a3d",
              backgroundColor: "white",
              color: "#6b2a3d",
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}

