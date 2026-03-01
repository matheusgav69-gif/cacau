import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { products } from "./data/products";
import { offers } from "./data/offers";
import { createPixPayment, checkPaymentStatus } from "./services/blackcat";

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Opcional: servir imagens se você decidir colocá-las no backend
app.use("/images", express.static(path.join(__dirname, "../public/images")));

app.get("/api/products", (_req, res) => {
  res.json(products);
});

app.get("/api/offers", (_req, res) => {
  res.json(offers);
});

// Endpoint para criar pagamento PIX
app.post("/api/payment/create-sale", async (req, res) => {
  try {
    const paymentData = req.body;

    // Validações básicas
    if (!paymentData.amount || !paymentData.customer || !paymentData.items) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos. Verifique amount, customer e items.",
      });
    }

    // Chama o serviço de pagamento
    const result = await createPixPayment(paymentData);

    if (result.success && result.data) {
      return res.status(201).json({
        success: true,
        data: result.data,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || "Erro ao criar venda",
      });
    }
  } catch (error) {
    console.error("Erro no endpoint de pagamento:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Erro interno do servidor",
    });
  }
});

// Endpoint para consultar status do pagamento
app.get("/api/payment/status/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;

    const status = await checkPaymentStatus(transactionId);

    return res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Erro ao consultar status:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Erro ao consultar status",
    });
  }
});

app.listen(port, () => {
  console.log(`Backend rodando na porta ${port}`);
});

