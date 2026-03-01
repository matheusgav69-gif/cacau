# 💳 Integração Blackcat Pagamentos - PIX

## 🚀 Configuração Inicial

### 1. Obter API Key

1. Acesse [https://blackcatpagamentos.online](https://blackcatpagamentos.online)
2. Crie sua conta ou faça login
3. Vá para "Configurações" → "API" ou "Credenciais"
4. Copie sua **API Key**

### 2. Configurar Variáveis de Ambiente

No arquivo `backend/.env`, adicione:

```env
BLACKCAT_API_KEY=sua_api_key_aqui
PORT=4000
```

**⚠️ IMPORTANTE:** Nunca commite o arquivo `.env` com dados sensíveis! Use `.env.example` como template.

### 3. Instalar Dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Iniciar os Servidores

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## 📋 O que foi implementado

### Backend (`backend/src/`)

#### Novo arquivo: `services/blackcat.ts`
- Função `createPixPayment()` - Cria uma transação PIX na Blackcat
- Função `checkPaymentStatus()` - Verifica o status do pagamento

#### Novo endpoint: `POST /api/payment/create-sale`
**Request:**
```json
{
  "amount": 5000,
  "currency": "BRL",
  "paymentMethod": "pix",
  "items": [
    {
      "title": "Produto de Chocolate",
      "unitPrice": 2500,
      "quantity": 2,
      "tangible": true
    }
  ],
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "11999999999",
    "document": {
      "number": "12345678901",
      "type": "cpf"
    }
  },
  "shipping": {
    "name": "João Silva",
    "street": "Rua das Flores",
    "number": "123",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234567"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-1733654321-ABC123",
    "status": "PENDING",
    "paymentMethod": "pix",
    "amount": 5000,
    "netAmount": 4850,
    "fees": 150,
    "paymentData": {
      "qrCode": "00020126580014br.gov.bcb.pix...",
      "qrCodeBase64": "data:image/png;base64,...",
      "copyPaste": "00020126580014br.gov.bcb.pix...",
      "expiresAt": "2025-12-10T10:30:00.000Z"
    }
  }
}
```

#### Novo endpoint: `GET /api/payment/status/:transactionId`
Verifica o status atualizado de uma transação.

### Frontend (`frontend/src/pages/CheckoutPage.tsx`)

#### Novo estado:
- `pixData` - Armazena os dados do QR Code PIX após criação
- `paymentError` - Armazena mensagens de erro

#### Função `handleSubmit()` modificada:
- Coleta dados pessoais, endereço e carrinho
- Formata valores em centavos (conforme API Blackcat)
- Faz requisição POST para `/api/payment/create-sale`
- Exibe QR Code PIX se sucesso
- Mostra mensagem de erro se falhar

#### Nova interface PIX:
- Exibe QR Code em formato imagem
- Botão para copiar código PIX
- Instruções passo-a-passo
- ID da transação para referência
- Status visual com cores

---

## 🔄 Fluxo de Pagamento

```
1. Usuário preenche formulário ✓
   ↓
2. Clica em "Confirmar Compra" ✓
   ↓
3. Frontend envia dados para backend ✓
   ↓
4. Backend valida e chama API Blackcat ✓
   ↓
5. Blackcat gera QR Code PIX ✓
   ↓
6. Frontend exibe QR Code ✓
   ↓
7. Usuário escaneia e paga ✨
   ↓
8. Webhook recebe confirmação (próximo passo...)
```

---

## 📲 Testando com PIX

### Teste Automatizado
Você pode usar dados de teste fornecidos pela Blackcat:
- **Documento:** 12345678901
- **Email:** teste@example.com
- **Telefone:** 11999999999

### Teste Manual
1. Preencha o formulário com dados reais
2. Clique em "Confirmar Compra"
3. Escaneie o QR Code com qualquer app que leia QR (Câmera do iPhone, Google Lens, etc.)
4. Será redirecionado para o PIX
5. Confirme o pagamento no seu banco

---

## 🔐 Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `BLACKCAT_API_KEY` | Sua chave de API | `sk_live_abc123...` |
| `PORT` | Porta do servidor | `4000` |

---

## 🐛 Troubleshooting

### "BLACKCAT_API_KEY não configurada"
- Verifique se `.env` existe na pasta `backend/`
- Verifique se `BLACKCAT_API_KEY` está preenchido

### "Erro ao processar pagamento"
- Verifique se o backend está rodando na porta 4000
- Verifique se a API Key é válida
- Veja as logs do backend para mais detalhes

### "QR Code não aparece"
- Verifique o console do navegador (F12) para erros
- Verifique o network tab para ver a resposta da API

---

## 📚 Documentação Oficial

- [Blackcat Pagamentos - Documentação Completa](https://docs.blackcatpagamentos.online/)
- [API Reference](https://docs.blackcatpagamentos.online/#create-saleB)

---

## ✅ Próximos Passos

- [ ] Implementar webhooks para confirmação automática
- [ ] Adicionar página de status de pedido
- [ ] Integrar email de confirmação
- [ ] Adicionar dados de rastreamento (UTM)
- [ ] Implementar retry automático
- [ ] Adicionar suporte para outros métodos de pagamento (Cartão, Boleto)

---

## 📞 Suporte

Para dúvidas sobre a API Blackcat, visite:
https://docs.blackcatpagamentos.online/

Para dúvidas sobre a integração, verifique os logs:
- Backend: Terminal onde `npm run dev` foi executado
- Frontend: Console do navegador (F12)
