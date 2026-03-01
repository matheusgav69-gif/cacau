# Desafio de Memória - Cacau Show (Demo)

Este projeto é uma demonstração de um site de desafio promocional inspirado na ideia da Cacau Show. O usuário joga um **jogo da memória** com produtos da marca e, ao completar o desafio, recebe um **desconto especial**.

## Estrutura

- `backend/`: API em Node + Express que fornece a lista de produtos.
- `frontend/`: Aplicação React + Vite que exibe a página inicial e o jogo da memória.

## Backend

Local: `backend/`

Principais arquivos:

- `src/data/products.ts`: lista estática de produtos do desafio.
- `src/server.ts`: servidor Express com rota `GET /api/products`.

Passos recomendados (no seu ambiente local, com Node e npm instalados):

```bash
cd backend
npm install
npm run dev
```

O backend ficará disponível em `http://localhost:4000`.

## Frontend

Local: `frontend/`

Principais arquivos:

- `src/main.tsx`: ponto de entrada React.
- `src/App.tsx`: carrega a `HomePage`.
- `src/pages/HomePage.tsx`: página inicial com explicação do desafio e botão para iniciar o jogo.
- `src/components/MemoryGame.tsx`: jogo da memória com fotos dos produtos e botão **"Tentar novamente"**.
- `src/types/Product.ts`: tipo dos dados de produto.

Passos recomendados:

```bash
cd frontend
npm install
npm run dev
```

O frontend ficará disponível em `http://localhost:5173`.

## Imagens dos produtos

As imagens dos produtos devem ser colocadas em:

- `frontend/public/images/produtos/`

Sugestão de nomes (já usados no backend):

- `trufa-amendoim.jpg`
- `tablete-meio-amargo.jpg`
- `bombom-ao-leite.jpg`

Você pode alterar os produtos ou nomes de arquivos editando `backend/src/data/products.ts`.

## Fluxo do desafio

1. O usuário acessa a página inicial no frontend.
2. Clica em **"Começar desafio"**.
3. O componente `MemoryGame` busca os produtos em `GET http://localhost:4000/api/products`.
4. As cartas são montadas em pares, embaralhadas e exibidas viradas.
5. Ao encontrar todos os pares, o usuário vê a mensagem de sucesso e o código de desconto.
6. A qualquer momento, o botão **"Tentar novamente"** reinicia o jogo (reembaralha e reseta o estado).

# cacau
