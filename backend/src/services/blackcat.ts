// Serviço de integração com Blackcat Pagamentos
import axios from "axios";

const API_BASE_URL = "https://api.blackcatpagamentos.online/api";

interface CustomerData {
  name: string;
  email: string;
  phone: string;
  document: {
    number: string;
    type: "cpf" | "cnpj";
  };
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

interface ItemData {
  title: string;
  unitPrice: number;
  quantity: number;
  tangible?: boolean;
}

interface CreateSalePayload {
  amount: number;
  currency?: string;
  paymentMethod: "pix";
  items: ItemData[];
  customer: CustomerData;
  shipping?: ShippingData;
  metadata?: string;
  postbackUrl?: string;
  externalRef?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  pix?: {
    expiresInDays?: number;
  };
}

interface PaymentResponse {
  success: boolean;
  data?: {
    transactionId: string;
    status: string;
    paymentMethod: string;
    amount: number;
    netAmount: number;
    fees: number;
    invoiceUrl: string;
    createdAt: string;
    paymentData: {
      qrCode: string;
      qrCodeBase64: string;
      copyPaste: string;
      expiresAt: string;
    };
  };
  message?: string;
  error?: string;
}

export async function createPixPayment(
  payload: CreateSalePayload
): Promise<PaymentResponse> {
  const API_KEY = process.env.BLACKCAT_API_KEY;
  
  if (!API_KEY) {
    throw new Error("BLACKCAT_API_KEY não configurada");
  }

  try {
    const response = await axios.post<PaymentResponse>(
      `${API_BASE_URL}/sales/create-sale`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Erro ao criar venda PIX:", error.response?.data);
      throw new Error(
        error.response?.data?.message || "Erro ao processar pagamento"
      );
    }
    throw error;
  }
}

export async function checkPaymentStatus(transactionId: string) {
  const API_KEY = process.env.BLACKCAT_API_KEY;
  
  if (!API_KEY) {
    throw new Error("BLACKCAT_API_KEY não configurada");
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/sales/status/${transactionId}`,
      {
        headers: {
          "X-API-Key": API_KEY,
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Erro ao verificar status:", error.response?.data);
      throw new Error("Erro ao verificar status do pagamento");
    }
    throw error;
  }
}
