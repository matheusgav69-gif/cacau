import { useEffect, useState } from "react";
import type { Product } from "../types/Product";
import { Toast } from "../components/Toast";

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:4000";

interface CartItem {
  product: Product;
  qty: number;
}

interface OffersPageProps {
  onBack: () => void;
  onCheckout?: () => void; // called when user clicks finalize
}

export function OffersPage({ onBack, onCheckout }: OffersPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>(() => {
    try {
      const stored = localStorage.getItem("cs_cart");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [adding, setAdding] = useState(false); // for animation/toast
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [resProducts, resOffers] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products`),
          fetch(`${API_BASE_URL}/api/offers`)
        ]);
        const products = await resProducts.json();
        const offers = await resOffers.json();
        const allProducts = [...products, ...offers];
        setProducts(allProducts);
      } catch (err) {
        console.error("failed to load products and offers", err);
      }
    }
    load();
  }, []);

  function handleQtyChange(product: Product, qty: number) {
    setCart((prev) => {
      const copy = { ...prev };
      if (qty <= 0) {
        delete copy[product.id];
        setToastMsg(`Removido ${product.name} do carrinho`);
      } else {
        copy[product.id] = { product, qty };
        setToastMsg(`Quantidade de ${product.name}: ${qty}`);
      }
      return copy;
    });
    setAdding(true);
    setTimeout(() => setAdding(false), 600);
  }

  function handleAddToCart(product: Product) {
    setLoadingId(product.id);
    // Simulate network/processing delay for realistic UX
    setTimeout(() => {
      const current = cart[product.id]?.qty || 0;
      handleQtyChange(product, current + 1);
      setLoadingId(null);
      setSuccessId(product.id);
      setToastMsg(`Adicionado ${product.name}`);
      // Show checkmark for 1.5 seconds
      setTimeout(() => setSuccessId(null), 1500);
    }, 800);
  }

  useEffect(() => {
    try {
      localStorage.setItem("cs_cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const total = Object.values(cart).reduce(
    (acc, item) => acc + (item.product.price || 0) * item.qty,
    0
  );

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "2rem 2rem" }}>
      <button
        onClick={onBack}
        style={{
          marginBottom: "1rem",
          cursor: "pointer",
          padding: "0.5rem 1rem",
          background: "#8a5a35",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontWeight: 500,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#6a4225")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#8a5a35")}
      >
        ← Voltar
      </button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Ofertas</h1>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => setShowCart(true)}
            disabled={Object.keys(cart).length === 0}
            style={{
              background: "none",
              border: "none",
              cursor: Object.keys(cart).length > 0 ? "pointer" : "not-allowed",
              padding: "0.25rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
              position: "relative",
              opacity: Object.keys(cart).length > 0 ? 1 : 0.5,
            }}
          >
            <svg
              className={adding ? 'cart-bump' : ''}
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8a5a35"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {Object.values(cart).reduce((acc, i) => acc + i.qty, 0) > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  background: "#c62828",
                  color: "#fff",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                {Object.values(cart).reduce((acc, i) => acc + i.qty, 0)}
              </span>
            )}
          </button>
          <span style={{ fontSize: "0.75rem", color: "#8a5a35", fontWeight: 500 }}>
            Ver carrinho
          </span>
        </div>
      </div>
      <div style={{ margin: "1rem 0", fontWeight: 600 }}>
        Total: <strong>{formatPrice(total)}</strong>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        {products.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "0.75rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
          >
            {p.discountPercent && (
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  background: "linear-gradient(135deg, #27ae60 0%, #229954 100%)",
                  color: "#fff",
                  padding: "0.4rem 0.65rem",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  boxShadow: "0 3px 8px rgba(39, 174, 96, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                  zIndex: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  lineHeight: 1.1,
                }}
              >
                <span style={{ fontSize: "0.7rem" }}>DESCONTO</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 900 }}>
                  -{p.discountPercent}%
                </span>
              </div>
            )}
            <img
              src={p.imageUrl}
              alt={p.name}
              style={{ width: "100%", height: 120, objectFit: "contain" }}
            />
            <div style={{ margin: "0.5rem 0", textAlign: "center", fontSize: "0.95rem" }}>
              {p.name}
            </div>
            <div style={{ marginBottom: "0.5rem", textAlign: "center", minHeight: "2.5rem" }}>
              {p.originalPrice && p.discountPercent && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#aaa",
                    textDecoration: "line-through",
                    marginBottom: "0.25rem",
                  }}
                >
                  {formatPrice(p.originalPrice)}
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: "1.15rem", color: "#8a5a35" }}>
                {formatPrice(p.price || 0)}
              </div>
            </div>
            <div
              style={{
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
                color: "#8a5a35",
              }}
            >
              Resgatar essa oferta
            </div>
            <button
              onClick={() => handleAddToCart(p)}
              disabled={loadingId === p.id || successId === p.id}
              style={{
                padding: "0.5rem 0.8rem",
                background:
                  loadingId === p.id
                    ? "#7a5230"
                    : successId === p.id
                    ? "#2f7a3b"
                    : "#8a5a35",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: loadingId === p.id || successId === p.id ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginBottom: "0.5rem",
                transition: "all 0.3s ease",
                opacity: loadingId === p.id || successId === p.id ? 0.9 : 1,
              }}
            >
              {loadingId === p.id ? (
                <>
                  <span className="spinner"></span>
                  Processando...
                </>
              ) : successId === p.id ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="checkmark"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Adicionado!
                </>
              ) : (
                <>
                  <span>Adicionar ao carrinho</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </>
              )}
            </button>

            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <label>
                Qtd:
                <select
                  value={cart[p.id]?.qty || 0}
                  onChange={(e) =>
                    handleQtyChange(p, parseInt(e.target.value) || 0)
                  }
                  style={{ marginLeft: 4 }}
                >
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {cart[p.id] && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#8a5a35" }}>
                Subtotal: <strong>{formatPrice((p.price || 0) * cart[p.id].qty)}</strong>
              </div>
            )}
          </div>
        ))}
      </div>
      {total > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#fafafa",
            borderTop: "1px solid #ddd",
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <span>Total:&nbsp;<strong>{formatPrice(total)}</strong></span>
          <button
            onClick={() => onCheckout && onCheckout()}
            disabled={Object.keys(cart).length === 0}
            style={{
              padding: "0.65rem 1.2rem",
              background: "#8a5a35",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: Object.keys(cart).length === 0 ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            Finalizar compra
          </button>
        </div>
      )}

      {showCart && (
        <>
          <div
            onClick={() => setShowCart(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              width: "100%",
              maxWidth: 420,
              background: "#fff",
              boxShadow: "-4px 0 12px rgba(0,0,0,0.15)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              animation: "slide-in 0.3s ease-out",
            }}
          >
            <div
              style={{
                padding: "1rem",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0 }}>Seu Carrinho</h2>
              <button
                onClick={() => setShowCart(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "1rem",
              }}
            >
              {Object.values(cart).length === 0 ? (
                <p style={{ textAlign: "center", color: "#999" }}>Carrinho vazio</p>
              ) : (
                Object.values(cart).map((item) => (
                  <div
                    key={item.product.id}
                    style={{
                      marginBottom: "1rem",
                      padding: "0.75rem",
                      border: "1px solid #eee",
                      borderRadius: 6,
                      display: "flex",
                      gap: "0.75rem",
                    }}
                  >
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      style={{
                        width: 60,
                        height: 60,
                        objectFit: "contain",
                        borderRadius: 4,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                        {item.product.name}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#8a5a35", marginTop: "0.25rem" }}>
                        {formatPrice(item.product.price || 0)} x {item.qty} = {" "}
                        <strong>{formatPrice((item.product.price || 0) * item.qty)}</strong>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: "0.5rem" }}>
                        <button
                          onClick={() => handleQtyChange(item.product, item.qty - 1)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: "#f0f0f0",
                            border: "none",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          −
                        </button>
                        <span style={{ padding: "0.25rem 0.5rem" }}>{item.qty}</span>
                        <button
                          onClick={() => handleQtyChange(item.product, item.qty + 1)}
                          disabled={item.qty >= 10}
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: item.qty >= 10 ? "#ddd" : "#f0f0f0",
                            border: "none",
                            borderRadius: 3,
                            cursor: item.qty >= 10 ? "not-allowed" : "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleQtyChange(item.product, 0)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: "#ffebee",
                            color: "#c62828",
                            border: "none",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            marginLeft: "auto",
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {Object.values(cart).length > 0 && (
              <div
                style={{
                  padding: "1rem",
                  borderTop: "1px solid #eee",
                  background: "#f9f9f9",
                }}
              >
                <div style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
                  Total: <strong>{formatPrice(total)}</strong>
                </div>
                <button
                  onClick={() => alert("Iniciar checkout")}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "#8a5a35",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Finalizar compra
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </main>
  );
}
