# Contract Manager API

API para gerenciamento de smart contracts na rede Ethereum usando NestJS, TypeORM, DynamoDB e Hardhat.

## 📋 Descrição

Sistema completo para:
- Upload e gerenciamento de ABIs de contratos
- Deploy de smart contracts na blockchain
- Interação com contratos (leitura e escrita)
- Rastreamento de transações com status
- Persistência em MySQL e DynamoDB

## 🚀 Tecnologias

- **NestJS** - Framework Node.js
- **TypeORM** - ORM para MySQL
- **Ethers.js v6** - Biblioteca Ethereum
- **Hardhat** - Framework Solidity
- **DynamoDB** (LocalStack) - Armazenamento de ABIs
- **MySQL 8.0** - Banco de dados relacional
- **Docker Compose** - Orquestração de containers

## 📦 Instalação

```bash
npm install
```

## 🔧 Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
# Ethereum
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# DynamoDB (LocalStack)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
DYNAMODB_ENDPOINT=http://localhost:4566
DYNAMODB_TABLE_ABI=smart-contract-abis

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root123
DB_DATABASE=contract_manager
```

## 🐳 Iniciar Infraestrutura

```bash
# Iniciar MySQL e LocalStack
docker-compose up -d

# Verificar se os serviços estão rodando
docker-compose ps
```

## ▶️ Executar Aplicação

```bash
# Modo desenvolvimento
npm run start
```

A API estará disponível em: `http://localhost:3000`

---

## 📚 Endpoints

### 🔹 ABI Management

#### 1. Upload ABI

Upload de arquivo JSON contendo ABI e bytecode do contrato.

**Endpoint:** `POST /abi/upload`

**Content-Type:** `multipart/form-data`

**Body:**
- `file` - Arquivo JSON (Hardhat artifact ou formato solc)

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/abi/upload \
  -F "file=@artifacts/contracts/Token.sol/Token.json"
```

**Resposta:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "contractName": "Token",
  "message": "ABI salva no DynamoDB com sucesso."
}
```

---

#### 2. Listar ABIs

Retorna todas as ABIs armazenadas ou filtra por nome do contrato.

**Endpoint:** `GET /abi`

**Query Parameters:**
- `contractName` (opcional) - Filtrar por nome do contrato

**Exemplo cURL:**
```bash
# Listar todas as ABIs
curl http://localhost:3000/abi

# Filtrar por nome
curl "http://localhost:3000/abi?contractName=Token"
```

**Resposta:**
```json
{
  "message": "ABIs encontrados com sucesso.",
  "count": 2,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "contractName": "Token",
      "createdAt": "2025-01-15T10:30:00Z",
      "abi": [...]
    }
  ]
}
```

---

### 🔹 Contract Management

#### 3. Deploy Contract

Faz deploy de um smart contract na blockchain.

**Endpoint:** `POST /contract/deploy`

**Content-Type:** `application/json`

**Body:**
```json
{
  "abi_name": "Token",
  "constructor_args": ["MyToken", "MTK", 1000000],
  "overrides": {
    "gasLimit": 3000000
  }
}
```

**Parâmetros:**
- `abi_name` (string, obrigatório) - Nome da ABI previamente carregada
- `constructor_args` (array, opcional) - Argumentos do construtor do contrato
- `overrides` (object, opcional) - Opções da transação (gasLimit, gasPrice, value, etc.)

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/contract/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "abi_name": "Token",
    "constructor_args": ["MyToken", "MTK", 1000000]
  }'
```

**Resposta:**
```json
{
  "message": "Contract deployed successfully",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "txHash": "0x3f4d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
  "smartContractId": "650e8400-e29b-41d4-a716-446655440001",
  "receipt": {
    "blockNumber": 4123456,
    "gasUsed": "2891234",
    "status": 1
  }
}
```

---

#### 4. Chamar Função (Leitura)

Executa função `view` ou `pure` do contrato (não gasta gas, não modifica estado).

**Endpoint:** `POST /contract/call-function-read`

**Content-Type:** `application/json`

**Body:**
```json
{
  "contract_name": "Token",
  "contract_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "function_name": "balanceOf",
  "parameters": ["0x1234567890123456789012345678901234567890"]
}
```

**Parâmetros:**
- `contract_name` (string, obrigatório) - Nome do contrato
- `contract_address` (string, obrigatório) - Endereço do contrato na blockchain
- `function_name` (string, obrigatório) - Nome da função a ser chamada
- `parameters` (array, opcional) - Parâmetros da função

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/contract/call-function-read \
  -H "Content-Type: application/json" \
  -d '{
    "contract_name": "Token",
    "contract_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "function_name": "totalSupply",
    "parameters": []
  }'
```

**Resposta:**
```json
{
  "contract": "Token",
  "function": "totalSupply",
  "result": "1000000000000000000000000"
}
```

**Exemplo com parâmetros:**
```bash
curl -X POST http://localhost:3000/contract/call-function-read \
  -H "Content-Type: application/json" \
  -d '{
    "contract_name": "Token",
    "contract_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "function_name": "balanceOf",
    "parameters": ["0x1234567890123456789012345678901234567890"]
  }'
```

---

#### 5. Chamar Função (Escrita)

Executa função que modifica o estado do contrato (gasta gas, cria transação).

**Endpoint:** `POST /contract/call-function-write`

**Content-Type:** `application/json`

**Body:**
```json
{
  "contract_name": "Token",
  "contract_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "function_name": "transfer",
  "parameters": [
    "0x9876543210987654321098765432109876543210",
    "1000000000000000000"
  ]
}
```

**Parâmetros:**
- `contract_name` (string, obrigatório) - Nome do contrato
- `contract_address` (string, obrigatório) - Endereço do contrato
- `function_name` (string, obrigatório) - Nome da função
- `parameters` (array, opcional) - Parâmetros da função

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/contract/call-function-write \
  -H "Content-Type: application/json" \
  -d '{
    "contract_name": "Token",
    "contract_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "function_name": "transfer",
    "parameters": [
      "0x9876543210987654321098765432109876543210",
      "1000000000000000000"
    ]
  }'
```

**Resposta:**
```json
{
  "contract": "Token",
  "function": "transfer",
  "transactionId": "750e8400-e29b-41d4-a716-446655440002",
  "txHash": "0x5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
  "status": "CONCLUIDA"
}
```

**Status da Transação:**
- `ENVIADA` - Transação criada e enviada para a rede
- `PENDENTE` - Transação em processamento
- `CONCLUIDA` - Transação confirmada com sucesso
- `ERROR` - Transação falhou

---

## 🗄️ Estrutura do Banco de Dados

### MySQL

#### Tabela: `smart_contract`
```sql
- id (VARCHAR, PK)
- name (VARCHAR)
- address (VARCHAR, UNIQUE)
- tx_hash (VARCHAR, UNIQUE)
- id_abi (VARCHAR)
- ativo (BOOLEAN)
- created_at (TIMESTAMP)
```

#### Tabela: `transactions`
```sql
- id (VARCHAR, PK)
- id_smart_contract (VARCHAR, FK)
- tx_hash (VARCHAR, UNIQUE)
- status (ENUM: ENVIADA, PENDENTE, CONCLUIDA, ERROR)
- function_name (VARCHAR)
- created_at (TIMESTAMP)
```

### DynamoDB

#### Tabela: `smart-contract-abis`
```
- id (String, PK)
- contractName (String)
- createdAt (String)
- abi (List)
```

---

## 🧪 Exemplos Completos

### Fluxo Completo: Deploy e Interação

```bash
# 1. Upload da ABI
curl -X POST http://localhost:3000/abi/upload \
  -F "file=@artifacts/contracts/Token.sol/Token.json"

# 2. Deploy do contrato
curl -X POST http://localhost:3000/contract/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "abi_name": "Token",
    "constructor_args": ["MyToken", "MTK", 1000000]
  }'

# Resposta: { "contractAddress": "0x742d35Cc..." }

# 3. Ler dados (view function)
curl -X POST http://localhost:3000/contract/call-function-read \
  -H "Content-Type: application/json" \
  -d '{
    "contract_name": "Token",
    "contract_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "function_name": "name",
    "parameters": []
  }'

# 4. Escrever dados (state-changing function)
curl -X POST http://localhost:3000/contract/call-function-write \
  -H "Content-Type: application/json" \
  -d '{
    "contract_name": "Token",
    "contract_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "function_name": "mint",
    "parameters": ["0x1234567890123456789012345678901234567890", "1000000"]
  }'
```

---

## 🛠️ Hardhat (Desenvolvimento Solidity)

### Compilar Contratos

```bash
npx hardhat compile
```

### Executar Testes

```bash
npx hardhat test
```

### Deploy Local

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

---

## 📝 Notas

- As transações de escrita são rastreadas na tabela `transactions` com status
- Funções `view`/`pure` não gastam gas e não criam transações
- ABIs são armazenadas no DynamoDB para escalabilidade
- Contratos deployados são salvos no MySQL com relação ao ABI
- Use a rede Sepolia para testes (configure SEPOLIA_RPC_URL)

---