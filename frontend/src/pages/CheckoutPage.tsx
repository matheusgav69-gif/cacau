import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { PixPaymentPage } from "./PixPaymentPage";

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:4000";

// Formata preço para BRL
const formatPrice = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

interface CheckoutPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface PersonalData {
  name: string;
  email: string;
  phone: string;
  document: string;
}

interface ShippingData {
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

interface CartItem {
  product: {
    id: string;
    name: string;
    price?: number;
    imageUrl: string;
  };
  qty: number;
}

export function CheckoutPage({ onBack, onSuccess }: CheckoutPageProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [personal, setPersonal] = useState<PersonalData>({
    name: "",
    email: "",
    phone: "",
    document: "",
  });
  const [shipping, setShipping] = useState<ShippingData>({
    name: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos
  
  // Estados de validação
  const [validFields, setValidFields] = useState<Record<string, boolean>>({});
  const [loadingCEP, setLoadingCEP] = useState(false);
  
  // Estados de pagamento PIX
  const [pixData, setPixData] = useState<any>(null);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cs_cart");
      setCart(stored ? Object.values(JSON.parse(stored)) : []);
    } catch {}
  }, []);

  // Timer de urgência
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Validações
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/.test(phone.replace(/\s/g, ""));
  const validateCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, "");
    return numbers.length === 11;
  };
  const validateCEP = (cep: string) => /^\d{5}-?\d{3}$/.test(cep);

  // Buscar CEP
  async function handleCEPChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/[^0-9\-]/g, ""); // Remover tudo que não é número ou hífen
    setShipping({ ...shipping, zipCode: value });
    
    if (!validateCEP(value)) {
      setValidFields({ ...validFields, zipCode: false });
      return;
    }

    setLoadingCEP(true);
    try {
      const cepClean = value.replace("-", "");
      const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setShipping((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          zipCode: value,
        }));
        setValidFields({ ...validFields, zipCode: true });
      } else {
        setValidFields({ ...validFields, zipCode: false });
      }
    } catch (err) {
      console.error(err);
      setValidFields({ ...validFields, zipCode: false });
    } finally {
      setLoadingCEP(false);
    }
  }


  function handlePersonalChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    let finalValue = value;
    
    // Bloquear letras em campos numéricos
    if (name === "phone" || name === "document") {
      finalValue = value.replace(/[^0-9\-()]/g, "");
    }
    
    setPersonal({ ...personal, [name]: finalValue });
    
    // Validar campo
    if (name === "email") {
      setValidFields({ ...validFields, email: validateEmail(finalValue) });
    } else if (name === "phone") {
      setValidFields({ ...validFields, phone: validatePhone(finalValue) });
    } else if (name === "document") {
      setValidFields({ ...validFields, document: validateCPF(finalValue) });
    } else if (name === "name") {
      setValidFields({ ...validFields, name: finalValue.length >= 3 });
    }
  }

  function handleShippingChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    let finalValue = value;
    
    // Bloquear letras em campos numéricos
    if (name === "number") {
      finalValue = value.replace(/[^0-9]/g, "");
    }
    
    setShipping({ ...shipping, [name]: finalValue });
    
    // Validar campo
    if (name === "number") {
      setValidFields({ ...validFields, number: finalValue.length >= 1 });
    } else if (name === "name") {
      setValidFields({ ...validFields, shippingName: finalValue.length >= 3 });
    }
  }

  function applyCoupon() {
    if (coupon.toLowerCase() === "cacaushow10") {
      setDiscount(0.1);
      setCoupon("");
    }
  }

  const subtotal = cart.reduce(
    (acc, c) => acc + (c.product.price || 0) * c.qty,
    0
  );

  const discountAmount = subtotal * discount;
  const shipping_cost = 0;
  const total = subtotal - discountAmount + shipping_cost;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setPaymentError("");
    
    try {
      // Preparar dados para a API Blackcat
      const amountInCents = Math.round(total * 100); // Converter para centavos
      
      const paymentPayload = {
        amount: amountInCents,
        currency: "BRL",
        paymentMethod: "pix",
        items: cart.map((item) => ({
          title: item.product.name,
          unitPrice: Math.round((item.product.price || 0) * 100), // Converter para centavos
          quantity: item.qty,
          tangible: true, // Produtos físicos da Cacau Show
        })),
        customer: {
          name: personal.name,
          email: personal.email,
          phone: personal.phone.replace(/\D/g, ""), // Remover caracteres não numéricos
          document: {
            number: personal.document.replace(/\D/g, ""), // Apenas números
            type: "cpf",
          },
        },
        shipping: {
          name: shipping.name,
          street: shipping.street,
          number: shipping.number,
          complement: shipping.complement || "",
          neighborhood: shipping.neighborhood,
          city: shipping.city,
          state: shipping.state,
          zipCode: shipping.zipCode.replace(/\D/g, ""), // Apenas números
        },
        pix: {
          expiresInDays: 1, // PIX expira em 1 dia
        },
        externalRef: `ORDER-${Date.now()}`, // Referência única da compra
        metadata: `Pedido da Cacau Show - ${discount > 0 ? "Com desconto de " + Math.round(discount * 100) + "%" : "Sem desconto"}`,
      };

      // Chamar API de pagamento
      const response = await fetch(`${API_BASE_URL}/api/payment/create-sale`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao processar pagamento");
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Armazenar dados do PIX
        setPixData(result.data);
        // Manter na tela de pagamento para exibir o QR Code
      } else {
        throw new Error(result.message || "Erro desconhecido");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao processar pagamento";
      setPaymentError(errorMessage);
      console.error("Erro no pagamento:", err);
    } finally {
      setSubmitting(false);
    }
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const stepLabels = [
    "Informações Pessoais",
    "Endereço de Entrega",
    "Pagamento",
  ];

  // Se PIX foi processado com sucesso, mostrar página de pagamento dedicada
  if (pixData) {
    return (
      <PixPaymentPage
        pixData={pixData}
        onBack={() => {
          setPixData(null);
          setStep(3);
        }}
      />
    );
  }

  return (
    <div style={{ background: "linear-gradient(135deg, #f5f1eb 0%, #fff9f0 100%)", minHeight: "100vh" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #8a5a35 0%, #a0694f 100%)",
          color: "#fff",
          padding: "1.5rem 1rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(1.3rem, 5vw, 1.8rem)", fontWeight: 700 }}>
              Cacau Show
            </h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "clamp(0.75rem, 3vw, 0.9rem)", opacity: 0.9 }}>
              Finalizar Compra
            </p>
          </div>
          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              padding: "0.6rem 1rem",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 500,
              transition: "all 0.2s",
              fontSize: "clamp(0.8rem, 2vw, 1rem)",
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(255,255,255,0.3)";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(255,255,255,0.2)";
            }}
          >
            ← Voltar
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(1rem, 5vw, 2rem)" }}>
        {/* Progress Indicator */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "clamp(0.5rem, 2vw, 1rem)",
            marginBottom: "clamp(1.5rem, 5vw, 3rem)",
          }}
        >
          {stepLabels.map((label, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: "clamp(32px, 8vw, 40px)",
                  height: "clamp(32px, 8vw, 40px)",
                  borderRadius: "50%",
                  background:
                    step > idx + 1
                      ? "#2f7a3b"
                      : step === idx + 1
                      ? "linear-gradient(135deg, #ff6b6b, #ff8787)"
                      : "#ddd",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                  fontSize: "clamp(0.8rem, 2vw, 1rem)",
                  flexShrink: 0,
                }}
              >
                {step > idx + 1 ? "✓" : idx + 1}
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "clamp(0.65rem, 2vw, 0.85rem)",
                    color: "#666",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column layout - responsive */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "clamp(1rem, 4vw, 2rem)",
        }}
        className="checkout-grid"
        >
          {/* Left column - Form */}
          <div>
            <form onSubmit={handleSubmit}>
              {/* Step 1: Personal Data */}
              {step === 1 && (
                <div
                  style={{
                    background: "#fff",
                    padding: "clamp(1rem, 5vw, 2rem)",
                    borderRadius: 12,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <h2 style={{ margin: "0 0 clamp(0.75rem, 3vw, 1.5rem)", fontSize: "clamp(1.2rem, 5vw, 1.5rem)", color: "#333" }}>
                    👤 Informações Pessoais
                  </h2>
                  <p style={{ color: "#666", marginBottom: "clamp(0.75rem, 3vw, 1.5rem)", fontSize: "clamp(0.85rem, 2vw, 1rem)" }}>
                    Para quem é esse pedido?
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(0.5rem, 3vw, 1rem)", marginBottom: "clamp(0.75rem, 3vw, 1.5rem)" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          color: "#333",
                          fontWeight: 600,
                          fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
                        }}
                      >
                        Nome Completo * {validFields.name && <span style={{ color: "#2f7a3b" }}>✓</span>}
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={personal.name}
                        onChange={handlePersonalChange}
                        placeholder="Seu nome completo"
                        required
                        style={{
                          width: "100%",
                          padding: "clamp(0.5rem, 2vw, 0.75rem)",
                          border: `1px solid ${validFields.name ? "#2f7a3b" : "#d9d9d9"}`,
                          background: validFields.name ? "#f8fdf6" : "#fff",
                          borderRadius: 8,
                          fontSize: "clamp(0.85rem, 2vw, 1rem)",
                          transition: "border 0.2s",
                          boxSizing: "border-box",
                          backgroundColor: validFields.name ? "#f0fff4" : "#fff",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#8a5a35";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = validFields.name ? "#2f7a3b" : "#d9d9d9";
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          color: "#333",
                          fontWeight: 600,
                          fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
                        }}
                      >
                        E-mail * {validFields.email && <span style={{ color: "#2f7a3b" }}>✓</span>}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={personal.email}
                        onChange={handlePersonalChange}
                        placeholder="seu@email.com"
                        required
                        style={{
                          width: "100%",
                          padding: "clamp(0.5rem, 2vw, 0.75rem)",
                          border: `1px solid ${validFields.email ? "#2f7a3b" : "#d9d9d9"}`,
                          background: validFields.email ? "#f8fdf6" : "#fff",
                          borderRadius: 8,
                          fontSize: "clamp(0.85rem, 2vw, 1rem)",
                          transition: "border 0.2s",
                          boxSizing: "border-box",
                          backgroundColor: validFields.email ? "#f0fff4" : "#fff",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#8a5a35";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = validFields.email ? "#2f7a3b" : "#d9d9d9";
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(0.5rem, 3vw, 1rem)", marginBottom: "clamp(0.75rem, 3vw, 1.5rem)" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          color: "#333",
                          fontWeight: 600,
                          fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
                        }}
                      >
                        Telefone * {validFields.phone && <span style={{ color: "#2f7a3b" }}>✓</span>}
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={personal.phone}
                        onChange={handlePersonalChange}
                        placeholder="(11) 99999-9999"
                        required
                        style={{
                          width: "100%",
                          padding: "clamp(0.5rem, 2vw, 0.75rem)",
                          border: `1px solid ${validFields.phone ? "#2f7a3b" : "#d9d9d9"}`,
                          background: validFields.phone ? "#f8fdf6" : "#fff",
                          borderRadius: 8,
                          fontSize: "clamp(0.85rem, 2vw, 1rem)",
                          transition: "border 0.2s",
                          boxSizing: "border-box",
                          backgroundColor: validFields.phone ? "#f0fff4" : "#fff",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#8a5a35";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = validFields.phone ? "#2f7a3b" : "#d9d9d9";
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          color: "#333",
                          fontWeight: 600,
                          fontSize: "clamp(0.8rem, 2vw, 0.9rem)",
                        }}
                      >
                        CPF * {validFields.document && <span style={{ color: "#2f7a3b" }}>✓</span>}
                      </label>
                      <input
                        type="text"
                        name="document"
                        value={personal.document}
                        onChange={handlePersonalChange}
                        placeholder="000.000.000-00"
                        required
                        style={{
                          width: "100%",
                          padding: "clamp(0.5rem, 2vw, 0.75rem)",
                          border: `1px solid ${validFields.document ? "#2f7a3b" : "#d9d9d9"}`,
                          background: validFields.document ? "#f8fdf6" : "#fff",
                          borderRadius: 8,
                          fontSize: "clamp(0.85rem, 2vw, 1rem)",
                          transition: "border 0.2s",
                          boxSizing: "border-box",
                          backgroundColor: validFields.document ? "#f0fff4" : "#fff",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#8a5a35";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = validFields.document ? "#2f7a3b" : "#d9d9d9";
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    style={{
                      width: "100%",
                      padding: "clamp(0.7rem, 2vw, 0.9rem)",
                      background: "linear-gradient(135deg, #2f7a3b, #1f5a2b)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: "clamp(0.9rem, 2vw, 1rem)",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.3s",
                      marginTop: "clamp(0.75rem, 3vw, 1rem)",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        "translateY(-1px)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 4px 12px rgba(47, 122, 59, 0.15)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        "translateY(0)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "none";
                    }}
                  >
                    Próximo: Entrega →
                  </button>
                </div>
              )}

              {/* Step 2: Shipping */}
              {step === 2 && (
                <div
                  style={{
                    background: "#fff",
                    padding: "2rem",
                    borderRadius: 12,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem", color: "#333" }}>
                    📮 Endereço de Entrega
                  </h2>
                  <p style={{ color: "#666", marginBottom: "1.5rem" }}>
                    Como deseja receber seu pedido?
                  </p>

                  {/* CEP - PRIMEIRO */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        color: "#333",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                      }}
                    >
                      CEP * {loadingCEP && <span style={{ color: "#ff6b6b" }}>🔄 Buscando...</span>} {validFields.zipCode && <span style={{ color: "#2f7a3b" }}>✓</span>}
                    </label>
                    <input
                      type="text"
                      value={shipping.zipCode}
                      onChange={handleCEPChange}
                      placeholder="00000-000"
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: `1px solid ${loadingCEP ? "#ffc700" : validFields.zipCode ? "#2f7a3b" : "#d9d9d9"}`,
                        background: validFields.zipCode ? "#f8fdf6" : loadingCEP ? "#fffef0" : "#fff",
                        borderRadius: 8,
                        fontSize: "1rem",
                        transition: "border 0.2s",
                        backgroundColor: validFields.zipCode ? "#f0fff4" : "#fff",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#8a5a35";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = validFields.zipCode ? "#2f7a3b" : "#d9d9d9";
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        color: "#333",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                      }}
                    >
                      Nome do Destinatário * {validFields.shippingName && <span style={{ color: "#2f7a3b" }}>✓</span>}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={shipping.name}
                      onChange={handleShippingChange}
                      placeholder="Nome do destinatário"
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: `1px solid ${validFields.shippingName ? "#2f7a3b" : "#d9d9d9"}`,
                        background: validFields.shippingName ? "#f8fdf6" : "#fff",
                        borderRadius: 8,
                        fontSize: "1rem",
                        transition: "border 0.2s",
                        backgroundColor: validFields.shippingName ? "#f0fff4" : "#fff",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#8a5a35";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = validFields.shippingName ? "#2f7a3b" : "#d9d9d9";
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          color: "#333",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                        }}
                      >
                        Rua *
                      </label>
                      <input
                        type="text"
                        name="street"
                        value={shipping.street}
                        onChange={handleShippingChange}
                        placeholder="Nome da rua"
                        required
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: "1px solid #d9d9d9",
                          borderRadius: 8,
                          fontSize: "1rem",
                          transition: "border 0.2s",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#8a5a35";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d9d9d9";
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          color: "#333",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                        }}
                      >
                        Número * {validFields.number && <span style={{ color: "#2f7a3b" }}>✓</span>}
                      </label>
                      <input
                        type="text"
                        name="number"
                        value={shipping.number}
                        onChange={handleShippingChange}
                        placeholder="123"
                        required
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: `1px solid ${validFields.number ? "#2f7a3b" : "#d9d9d9"}`,
                          background: validFields.number ? "#f8fdf6" : "#fff",
                          borderRadius: 8,
                          fontSize: "1rem",
                          transition: "border 0.2s",
                          backgroundColor: validFields.number ? "#f0fff4" : "#fff",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#8a5a35";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = validFields.number ? "#2f7a3b" : "#d9d9d9";
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        color: "#333",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                      }}
                    >
                      Complemento (Apto, bloco, etc)
                    </label>
                    <input
                      type="text"
                      name="complement"
                      value={shipping.complement || ""}
                      onChange={handleShippingChange}
                      placeholder="Apartamento 42"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #d9d9d9",
                        borderRadius: 8,
                        fontSize: "1rem",
                        transition: "border 0.2s",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#8a5a35";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#d9d9d9";
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          color: "#333",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                        }}
                      >
                        Bairro *
                      </label>
                      <input
                        type="text"
                        name="neighborhood"
                        value={shipping.neighborhood}
                        onChange={handleShippingChange}
                        placeholder="Bairro"
                        required
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: "1px solid #d9d9d9",
                          borderRadius: 8,
                          fontSize: "1rem",
                          transition: "border 0.2s",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#8a5a35";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d9d9d9";
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          color: "#333",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                        }}
                      >
                        Cidade *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={shipping.city}
                        onChange={handleShippingChange}
                        placeholder="Cidade"
                        required
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: "1px solid #d9d9d9",
                          borderRadius: 8,
                          fontSize: "1rem",
                          transition: "border 0.2s",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#8a5a35";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d9d9d9";
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        color: "#333",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                      }}
                    >
                      Estado (UF) *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={shipping.state}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
                        setShipping({ ...shipping, state: value });
                      }}
                      placeholder="SP"
                      maxLength={2}
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #d9d9d9",
                        borderRadius: 8,
                        fontSize: "1rem",
                        transition: "border 0.2s",
                        textTransform: "uppercase",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#8a5a35";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#d9d9d9";
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "2rem" }}>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{
                        padding: "0.9rem",
                        background: "#f0f0f0",
                        color: "#333",
                        border: "none",
                        borderRadius: 8,
                        fontSize: "1rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.3s",
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          "#e0e0e0";
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          "#f0f0f0";
                      }}
                    >
                      ← Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      style={{
                        padding: "0.9rem",
                        background: "linear-gradient(135deg, #2f7a3b, #1f5a2b)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: "1rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.3s",
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform =
                          "translateY(-1px)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                          "0 4px 12px rgba(47, 122, 59, 0.15)";
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform =
                          "translateY(0)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                          "none";
                      }}
                    >
                      Próximo: Pagamento →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <div
                  style={{
                    background: "#fff",
                    padding: "2rem",
                    borderRadius: 12,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem", color: "#333" }}>
                    💳 Método de Pagamento
                  </h2>

                  <div
                    style={{
                      background: "linear-gradient(135deg, #f0f9f7, #e8f5f1)",
                      padding: "2rem",
                      borderRadius: 12,
                      marginBottom: "1.5rem",
                      border: "3px solid #2f7a3b",
                      boxShadow: "0 2px 8px rgba(47, 122, 59, 0.08)",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 2px 8px rgba(47, 122, 59, 0.08)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 2px 8px rgba(47, 122, 59, 0.08)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
                      {/* PIX Logo */}
                      <div
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: 12,
                          background: "linear-gradient(135deg, #2f7a3b, #1e5a2b)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "2rem",
                          fontWeight: 700,
                          boxShadow: "0 2px 6px rgba(47, 122, 59, 0.15)",
                          flexShrink: 0,
                        }}
                      >
                        <i className="fa-brands fa-pix" style={{ fontSize: "2.2rem" }}></i>
                      </div>
                      
                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1.4rem", color: "#1e5a2b" }}>
                            PIX
                          </h3>
                          <span
                            style={{
                              background: "#2f7a3b",
                              color: "#fff",
                              padding: "0.25rem 0.75rem",
                              borderRadius: 20,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            RECOMENDADO
                          </span>
                        </div>
                        
                        <p style={{ margin: "0 0 1rem", color: "#555", fontSize: "0.95rem" }}>
                          O jeito mais rápido e seguro de pagar
                        </p>

                        {/* Benefits Grid */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                            gap: "1rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.2rem" }}>⚡</span>
                            <span style={{ fontSize: "0.85rem", color: "#333", fontWeight: 500 }}>
                              Instantâneo
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.2rem" }}>🔒</span>
                            <span style={{ fontSize: "0.85rem", color: "#333", fontWeight: 500 }}>
                              Seguro
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.2rem" }}>💰</span>
                            <span style={{ fontSize: "0.85rem", color: "#333", fontWeight: 500 }}>
                              Sem taxa
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.2rem" }}>✓</span>
                            <span style={{ fontSize: "0.85rem", color: "#333", fontWeight: 500 }}>
                              Sem juros
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#f0fdf4",
                      padding: "1.25rem",
                      borderRadius: 10,
                      border: "1px solid #2f7a3b",
                      marginBottom: "1.5rem",
                      display: "flex",
                      gap: "1rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>✨</span>
                    <div>
                      <p style={{ margin: "0 0 0.25rem", fontWeight: 600, color: "#1e5a2b", fontSize: "0.95rem" }}>
                        Como funciona:
                      </p>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#555", lineHeight: 1.5 }}>
                        Após confirmar seu pedido, você receberá um código QR PIX para escanear com seu celular. O pagamento é processado na hora!
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "2rem" }}>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      style={{
                        padding: "0.9rem",
                        background: "#f0f0f0",
                        color: "#333",
                        border: "none",
                        borderRadius: 8,
                        fontSize: "1rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.3s",
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          "#e0e0e0";
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          "#f0f0f0";
                      }}
                    >
                      ← Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: "0.9rem",
                        background: submitting
                          ? "#ccc"
                          : "linear-gradient(135deg, #ff6b6b, #ff8787)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: "1rem",
                        fontWeight: 600,
                        cursor: submitting ? "not-allowed" : "pointer",
                        transition: "all 0.3s",
                      }}
                      onMouseOver={(e) => {
                        if (!submitting) {
                          (e.currentTarget as HTMLButtonElement).style.transform =
                            "translateY(-1px)";
                          (e.currentTarget as HTMLButtonElement).style.boxShadow =
                            "0 4px 12px rgba(255, 107, 107, 0.15)";
                        }
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform =
                          "translateY(0)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                          "none";
                      }}
                    >
                      {submitting ? "Processando..." : "Confirmar Compra"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Right column - Summary (Sticky) */}
          <div
            style={{
              height: "fit-content",
              position: "sticky",
              top: "2rem",
            }}
          >
            {/* Urgency Timer */}
            <div
              style={{
                background: "linear-gradient(135deg, #ff6b6b, #ff8787)",
                color: "#fff",
                padding: "1.5rem",
                borderRadius: 12,
                marginBottom: "1.5rem",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(255, 107, 107, 0.1)",
              }}
            >
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", opacity: 0.9 }}>
                ⏰ Oferta Válida por
              </p>
              <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700 }}>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </h3>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", opacity: 0.85 }}>
                Não perca essa chance!
              </p>
            </div>

            {/* Order Summary */}
            <div
              style={{
                background: "#fff",
                padding: "1.5rem",
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: 700 }}>
                📦 Resumo do Pedido
              </h3>

              {cart.length === 0 ? (
                <p style={{ color: "#999", textAlign: "center", margin: "1rem 0" }}>
                  Carrinho vazio
                </p>
              ) : (
                <div style={{ marginBottom: "1rem" }}>
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        marginBottom: "1rem",
                        paddingBottom: "1rem",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        style={{
                          width: 60,
                          height: 60,
                          objectFit: "contain",
                          borderRadius: 6,
                          background: "#f8f8f8",
                          padding: "4px",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            margin: "0 0 0.25rem",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            color: "#333",
                          }}
                        >
                          {item.product.name}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.85rem",
                            color: "#666",
                          }}
                        >
                          {item.qty}x {formatPrice(item.product.price || 0)}
                        </p>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          color: "#ff6b6b",
                        }}
                      >
                        {formatPrice((item.product.price || 0) * item.qty)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing */}
              <div
                style={{
                  paddingTop: "1rem",
                  borderTop: "2px solid #f0f0f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                    fontSize: "0.9rem",
                    color: "#666",
                  }}
                >
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {discount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.75rem",
                      fontSize: "0.9rem",
                      color: "#2f7a3b",
                      fontWeight: 600,
                    }}
                  >
                    <span>🎉 Desconto</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                    fontSize: "0.9rem",
                    color: "#666",
                  }}
                >
                  <span>Frete</span>
                  <span style={{ color: "#2f7a3b", fontWeight: 600 }}>Grátis</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "2px solid #f0f0f0",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: "#333",
                  }}
                >
                  <span>Total</span>
                  <span style={{ color: "#ff6b6b" }}>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Coupon Section */}
            <div
              style={{
                background: "#f8f8f8",
                padding: "1rem",
                borderRadius: 8,
                marginBottom: "1.5rem",
                border: "1px solid #e0e0e0",
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Cupom de desconto"
                  style={{
                    flex: 1,
                    padding: "0.6rem",
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    fontSize: "0.9rem",
                  }}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  style={{
                    padding: "0.6rem 1rem",
                    background: "#8a5a35",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#a0694f";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#8a5a35";
                  }}
                >
                  Aplicar
                </button>
              </div>
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontSize: "0.75rem",
                  color: "#999",
                }}
              >
                💡 Dica: tente "CACAUSHOW10"
              </p>
            </div>

            {/* Trust Badges */}
            <div
              style={{
                background: "#f8f8f8",
                padding: "1rem",
                borderRadius: 8,
                border: "1px solid #e0e0e0",
              }}
            >
              <p
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "#999",
                  letterSpacing: "0.5px",
                }}
              >
                Garantias e Segurança
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.85rem" }}>
                  <span>🔒</span>
                  <span>Pagamento 100% Seguro</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.85rem" }}>
                  <span>✓</span>
                  <span>Frete Grátis</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.85rem" }}>
                  <span>📦</span>
                  <span>Rastreamento em Tempo Real</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.85rem" }}>
                  <span>❤️</span>
                  <span>7 Dias para Devolver</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
