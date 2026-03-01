import { useState, useEffect } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";

interface PixPaymentPageProps {
  pixData: any;
  onBack: () => void;
}

export function PixPaymentPage({ pixData, onBack }: PixPaymentPageProps) {
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("PENDING");
  const [isPolling, setIsPolling] = useState(true);

  console.log("📄 PixPaymentPage renderizado. pixData:", pixData);

  // Polling para verificar status do pagamento
  useEffect(() => {
    if (!isPolling || !pixData?.transactionId) {
      console.log("⏸️  Polling parado. isPolling:", isPolling, "transactionId:", pixData?.transactionId);
      return;
    }

    console.log("🔄 Iniciando polling de pagamento para transação:", pixData.transactionId);

    const interval = setInterval(async () => {
      console.log("📡 Verificando status do pagamento...", new Date().toLocaleTimeString());
      
      try {
        const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:4000";
        const response = await fetch(
          `${API_BASE_URL}/api/payment/status/${pixData.transactionId}`
        );
        const result = await response.json();

        console.log("✅ Resposta recebida:", result);

        if (result.success && result.data?.data) {
          const status = result.data.data.status;
          console.log("💳 Status atual: " + status);
          setPaymentStatus(status);

          // Para o polling se o pagamento foi confirmado
          if (status === "PAID") {
            console.log("🎉 PAGAMENTO CONFIRMADO! Parando polling...");
            setIsPolling(false);
          }
        } else {
          console.warn("⚠️  Resposta sem dados esperados:", result);
        }
      } catch (error) {
        console.error("❌ Erro ao verificar status:", error);
      }
    }, 5000); // Verifica a cada 5 segundos

    return () => {
      console.log("🛑 Limpando interval de polling");
      clearInterval(interval);
    };
  }, [pixData?.transactionId, isPolling]);

  useEffect(() => {
    if (copied) {
      console.log("📋 Código PIX copiado para a área de transferência!");
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const copyToClipboard = () => {
    if (pixData?.paymentData?.copyPaste) {
      console.log("🔄 Copiando código PIX para área de transferência...");
      navigator.clipboard.writeText(pixData.paymentData.copyPaste);
      setCopied(true);
    } else {
      console.warn("⚠️  Nenhum código PIX disponível para copiar");
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .payment-badge {
          animation: fadeIn 0.5s ease-in;
        }

        .status-loading {
          animation: pulse 1.5s infinite;
        }
      `}</style>
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0fdf4, #e8f5f1)",
        padding: "2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          width: "100%",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 10px 40px rgba(47, 122, 59, 0.15)",
          padding: "3rem 2rem",
        }}
      >
        {/* Header com Icon */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              background: "linear-gradient(135deg, #2f7a3b, #1e5a2b)",
              borderRadius: "50%",
              margin: "0 auto 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "3rem",
              boxShadow: "0 4px 16px rgba(47, 122, 59, 0.2)",
            }}
          >
            <i className="fa-brands fa-pix"></i>
          </div>
          <h1
            style={{
              margin: "0 0 0.5rem",
              fontSize: "2rem",
              color: "#1e5a2b",
              fontWeight: 700,
            }}
          >
            Pagamento PIX
          </h1>
          <p
            style={{
              margin: 0,
              color: "#666",
              fontSize: "0.95rem",
            }}
          >
            Escaneie o código QR abaixo com seu celular
          </p>
        </div>

        {/* Status Badge */}
        {paymentStatus === "PAID" && (
          <div
            style={{
              background: "#d4edda",
              border: "1px solid #28a745",
              borderRadius: 10,
              padding: "1.2rem",
              marginBottom: "2rem",
              textAlign: "center",
              animation: "fadeIn 0.5s ease-in",
            }}
          >
            <p
              style={{
                margin: "0 0 0.5rem",
                fontSize: "1.5rem",
                color: "#28a745",
              }}
            >
              ✓ Pagamento Confirmado!
            </p>
            <p
              style={{
                margin: 0,
                color: "#155724",
                fontSize: "0.95rem",
              }}
            >
              Obrigado! Sua compra foi confirmada com sucesso. Você receberá um
              email de confirmação em breve.
            </p>
          </div>
        )}

        {/* QR Code Container */}
        <div
          style={{
            background: "#f8f8f8",
            padding: "2.5rem",
            borderRadius: 16,
            border: "2px dashed #2f7a3b",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          {pixData?.paymentData?.copyPaste ? (
            <div style={{ display: "inline-block" }}>
              <QRCode
                value={pixData.paymentData.copyPaste}
                size={280}
                level="H"
                includeMargin={true}
                style={{
                  borderRadius: 12,
                  border: "3px solid #2f7a3b",
                }}
              />
            </div>
          ) : (
            <p style={{ color: "#999", margin: 0 }}>Carregando QR Code...</p>
          )}
        </div>

        {/* Transaction ID */}
        <div
          style={{
            background: "#fff9f0",
            padding: "1rem",
            borderRadius: 10,
            border: "1px solid #ffc700",
            marginBottom: "2rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.85rem",
              color: "#ff6b00",
              fontWeight: 600,
            }}
          >
            ID da Transação
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: "#333",
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}
          >
            {pixData?.transactionId}
          </p>
        </div>

        {/* Copy Paste Section */}
        <div
          style={{
            background: "#f0f9f7",
            padding: "1.5rem",
            borderRadius: 10,
            border: "1px solid #2f7a3b",
            marginBottom: "2rem",
          }}
        >
          <p
            style={{
              margin: "0 0 1rem",
              fontSize: "0.85rem",
              color: "#555",
              fontWeight: 600,
            }}
          >
            📋 Ou copie o código PIX:
          </p>
          <div
            style={{
              background: "#fff",
              padding: "1rem",
              borderRadius: 8,
              border: "1px solid #d9d9d9",
              marginBottom: "1rem",
              maxHeight: "120px",
              overflowY: "auto",
              fontSize: "0.8rem",
              fontFamily: "monospace",
              color: "#333",
              wordBreak: "break-all",
            }}
          >
            {pixData?.paymentData?.copyPaste}
          </div>
          <button
            type="button"
            onClick={copyToClipboard}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "#2f7a3b",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.3s",
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#1e5a2b";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#2f7a3b";
            }}
          >
            {copied ? "✓ Código Copiado!" : "📋 Copiar Código PIX"}
          </button>
        </div>

        {/* Instructions */}
        <div
          style={{
            background: "#f8fdf6",
            padding: "1.5rem",
            borderRadius: 10,
            border: "1px solid #2f7a3b",
            marginBottom: "2rem",
          }}
        >
          <h3
            style={{
              margin: "0 0 1rem",
              color: "#1e5a2b",
              fontSize: "1rem",
              fontWeight: 700,
            }}
          >
            ✅ Como Pagar:
          </h3>
          <ol
            style={{
              margin: 0,
              paddingLeft: "1.5rem",
              color: "#555",
              lineHeight: 1.8,
              fontSize: "0.9rem",
            }}
          >
            <li>Abra seu app de banco ou carteira digital</li>
            <li>Procure pela opção "Pagar com PIX"</li>
            <li>
              Escolha <strong>"QR Code"</strong> ou <strong>"Copia e Cola"</strong>
            </li>
            <li>
              Para QR Code: escaneie a imagem acima com sua câmera ou app
            </li>
            <li>
              Para Copia e Cola: clique no botão acima e cole o código no seu
              banco
            </li>
            <li>Revise os dados e confirme o pagamento</li>
            <li>✨ Pronto! Você receberá uma confirmação na hora</li>
          </ol>
        </div>

        {/* Info Box */}
        <div
          style={{
            background: "#e8f5f1",
            padding: "1rem",
            borderRadius: 10,
            marginBottom: "2rem",
            fontSize: "0.85rem",
            color: "#555",
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: "0 0 0.5rem" }}>
            💡 <strong>Dica:</strong> O PIX é instantâneo! Seu pagamento será
            confirmado em segundos.
          </p>
          <p style={{ margin: 0 }}>
            🔒 <strong>Seguro:</strong> Nenhum dado é compartilhado. O
            Blackcat Pagamentos protege suas informações.
          </p>
        </div>

        {/* Amount Info */}
        <div
          style={{
            textAlign: "center",
            padding: "1rem",
            background: "#f8f8f8",
            borderRadius: 10,
            marginBottom: "2rem",
          }}
        >
          <p style={{ margin: "0 0 0.5rem", color: "#999", fontSize: "0.9rem" }}>
            Valor da Transação
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "1.8rem",
              fontWeight: 700,
              color: "#2f7a3b",
            }}
          >
            R${" "}
            {((pixData?.amount || 0) / 100).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p style={{ margin: "0.5rem 0 0", color: "#999", fontSize: "0.8rem" }}>
            (Após taxas: R${" "}
            {((pixData?.netAmount || 0) / 100).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            )
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "0.9rem",
              background: "#f0f0f0",
              color: "#333",
              border: "1px solid #d9d9d9",
              borderRadius: 8,
              fontSize: "0.9rem",
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
            onClick={() => {
              window.print();
            }}
            style={{
              padding: "0.9rem",
              background: "#2f7a3b",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.3s",
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#1e5a2b";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#2f7a3b";
            }}
          >
            🖨️ Imprimir
          </button>
        </div>

        {/* Support Info */}
        <div
          style={{
            textAlign: "center",
            marginTop: "2rem",
            paddingTop: "2rem",
            borderTop: "1px solid #e0e0e0",
            fontSize: "0.85rem",
            color: "#999",
          }}
        >
          <p style={{ margin: 0 }}>
            ❓ Dúvidas? Acesse{" "}
            <a
              href="https://blackcatpagamentos.online"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2f7a3b", textDecoration: "none" }}
            >
              blackcatpagamentos.online
            </a>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
