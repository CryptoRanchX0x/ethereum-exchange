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

### Modo 1: Com Private Key (Tradicional)
```env
# Ethereum Network
RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
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
DB_PASSWORD=root
DB_DATABASE=ethereum_exchange
```

### Modo 2: Com AWS KMS (Recomendado para Produção) 🔐
```env
# Ethereum Network
RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# AWS KMS (remove PRIVATE_KEY quando usar KMS)
KMS_KEY_ID=your-kms-key-id-or-alias
AWS_ENDPOINT=http://localhost:4566  # Apenas para LocalStack, remover em produção
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test              # Para LocalStack
AWS_SECRET_ACCESS_KEY=test          # Para LocalStack

# DynamoDB (LocalStack)
DYNAMODB_ENDPOINT=http://localhost:4566
DYNAMODB_TABLE_ABI=smart-contract-abis

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root
DB_DATABASE=ethereum_exchange
```

### 📋 Variáveis de Ambiente

#### Ethereum Network
- **`RPC_URL`** (obrigatório): URL do provedor Ethereum (Infura, Alchemy, ou node próprio)
  - Exemplo Sepolia: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`
  - Exemplo Mainnet: `https://mainnet.infura.io/v3/YOUR_PROJECT_ID`

#### Assinatura de Transações (escolha um dos métodos)
- **`PRIVATE_KEY`** (opcional): Chave privada em formato hexadecimal com prefixo `0x`
  - Usado para assinatura tradicional (não recomendado para produção)
  - Não use junto com KMS_KEY_ID
  
- **`KMS_KEY_ID`** (opcional): ID ou alias da chave no AWS KMS
  - Usado para assinatura segura via AWS KMS (recomendado)
  - Exemplo: `arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012`
  - Ou alias: `alias/ethereum-signer`

#### AWS KMS (se usar KMS_KEY_ID)
- **`AWS_ENDPOINT`** (opcional): Endpoint customizado do AWS
  - Apenas para LocalStack em desenvolvimento: `http://localhost:4566`
  - Remover em produção para usar AWS real
  
- **`AWS_REGION`** (obrigatório se usar KMS): Região AWS
  - Exemplo: `us-east-1`, `eu-west-1`
  
- **`AWS_ACCESS_KEY_ID`** (obrigatório se usar KMS): Credencial de acesso AWS
  - Em LocalStack: `test`
  - Em produção: use IAM roles ou credenciais reais
  
- **`AWS_SECRET_ACCESS_KEY`** (obrigatório se usar KMS): Credencial secreta AWS
  - Em LocalStack: `test`
  - Em produção: use IAM roles ou credenciais reais

#### DynamoDB
- **`DYNAMODB_ENDPOINT`** (opcional): Endpoint customizado do DynamoDB
  - Para LocalStack: `http://localhost:4566`
  - Remover em produção para usar DynamoDB real
  
- **`DYNAMODB_TABLE_ABI`** (obrigatório): Nome da tabela para armazenar ABIs
  - Padrão: `smart-contract-abis`
  
- **`AWS_REGION`** (obrigatório): Região AWS para DynamoDB
  - Exemplo: `us-east-1`

#### MySQL
- **`DB_HOST`** (obrigatório): Host do servidor MySQL
  - Desenvolvimento: `localhost`
  - Produção: IP ou domínio do servidor
  
- **`DB_PORT`** (obrigatório): Porta do MySQL
  - Padrão: `3306`
  
- **`DB_USERNAME`** (obrigatório): Usuário do banco
  - Desenvolvimento: `root`
  - Produção: usuário com permissões específicas
  
- **`DB_PASSWORD`** (obrigatório): Senha do banco
  
- **`DB_DATABASE`** (obrigatório): Nome do banco de dados
  - Padrão: `ethereum_exchange`

> 📖 **Veja [KMS_SETUP.md](./KMS_SETUP.md) para instruções detalhadas de configuração do AWS KMS**

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

## 📂 Arquitetura e Arquivos Principais

### Regras de Negócio

#### 📄 `src/contract/contract.service.ts`
**Responsabilidade:** Lógica central de contratos inteligentes

**Principais métodos:**
- `deployContract()` - Faz deploy de contratos na blockchain
  - Carrega ABI e bytecode do DynamoDB
  - Prepara transação de deployment
  - Assina via KMS ou private key
  - Salva contrato no MySQL com endereço e tx_hash
  
- `callFunctionRead()` - Executa funções view/pure (leitura)
  - Não gasta gas
  - Não cria transações
  - Retorna resultado imediatamente
  
- `callFunctionWrite()` - Executa funções que modificam estado
  - Gasta gas
  - Cria e assina transação
  - Registra transação no MySQL
  - Retorna tx_hash para acompanhamento
  
- `signAndBroadcastTransaction()` - Método privado centralizado
  - Preenche nonce, chainId, fee data
  - Estima gas (apenas para deploy)
  - Assina transação via KmsSigner
  - Faz broadcast na rede

**Dependências:**
- `KmsService` - Para assinatura de transações
- `SmartContractRepository` - Persistência de contratos
- `TransactionRepository` - Rastreamento de transações
- `AbiService` - Recuperação de ABIs do DynamoDB

---

#### 📄 `src/kms/kms.service.ts`
**Responsabilidade:** Integração com AWS KMS para assinatura criptográfica

**Principais métodos:**
- `getAddress()` - Deriva endereço Ethereum da chave pública KMS
  - Usa Keccak256 para gerar endereço
  - Cacheia resultado
  
- `getPublicKey()` - Obtém chave pública da KMS
  - Formato DER comprimido
  - Converte para formato Ethereum (64 bytes x,y)
  
- `signHash(messageHash)` - Assina hash de 32 bytes
  - Usa algoritmo ECDSA_SHA_256
  - Retorna assinatura r,s,v no formato Ethereum
  
- `signTransaction(transaction)` - Assina transação completa
  - Cria objeto Transaction do ethers
  - Calcula hash da transação
  - Assina via KMS
  - Serializa transação assinada
  
- `parseDERSignature(derSignature)` - Converte DER para r,s
  - Normaliza valor S (low-s requirement)
  - Garante compatibilidade com Ethereum
  
- `calculateRecoveryId(messageHash, signature)` - Calcula v (recovery ID)
  - Tenta v=27 e v=28
  - Verifica qual recupera o endereço correto

**Detalhes Técnicos:**
- Usa curva secp256k1 (padrão Ethereum)
- Normalização S-value obrigatória: `S ≤ secp256k1N / 2`
- Recovery ID permite recuperar chave pública da assinatura

---

#### 📄 `src/utils/getSigner.ts`
**Responsabilidade:** Abstração de assinatura de transações

**Classes:**
- `KmsSigner extends ethers.AbstractSigner`
  - Implementa interface do ethers.js
  - Delega assinatura para KmsService
  - Suporta signTransaction, signMessage, signTypedData
  
**Funções:**
- `getSigner(kmsService, provider)` - Factory pattern
  - Retorna KmsSigner se KMS_KEY_ID configurado
  - Fallback para Wallet com PRIVATE_KEY
  - Garante sempre ter um signer válido

**Princípio:** Responsabilidade única - apenas assina, não prepara transações

---

#### 📄 `src/abi/abi.service.ts`
**Responsabilidade:** Gerenciamento de ABIs no DynamoDB

**Principais métodos:**
- `saveAbi(contractName, abi)` - Salva ABI com ID único
- `getAbiById(id)` - Recupera ABI por ID
- `listAbis(contractName?)` - Lista ABIs com filtro opcional
- `deleteAbi(id)` - Remove ABI

**Estrutura dos dados:**
```typescript
{
  id: string,           // UUID
  contractName: string, // Nome do contrato
  abi: any[],          // Array da ABI
  bytecode?: string,   // Bytecode (opcional)
  createdAt: string    // Timestamp ISO
}
```

---

#### 📄 `src/utils/abi-loader.ts`
**Responsabilidade:** Parse e validação de arquivos ABI

**Principais funções:**
- `parseAbiFromBuffer(buffer)` - Extrai ABI e bytecode
  - Suporta formato Hardhat (artifacts)
  - Suporta formato solc padrão
  - Valida estrutura do JSON
  
**Formato aceito:**
```json
{
  "contractName": "Token",
  "abi": [...],
  "bytecode": "0x..."
}
```

---

### Fluxo de Dados

#### Deploy de Contrato
```
1. Cliente → POST /contract/deploy
2. ContractService.deployContract()
3. AbiService.getAbiById() → DynamoDB
4. ContractFactory.getDeployTransaction() → ethers.js
5. ContractService.signAndBroadcastTransaction()
6. KmsSigner.signTransaction() → KmsService
7. KmsService.signHash() → AWS KMS
8. Provider.broadcastTransaction() → Blockchain
9. SmartContractRepository.save() → MySQL
10. TransactionRepository.save() → MySQL
```

#### Chamada de Função (Write)
```
1. Cliente → POST /contract/call-function-write
2. ContractService.callFunctionWrite()
3. SmartContractRepository.findOne() → MySQL (busca contrato)
4. AbiService.getAbiById() → DynamoDB (busca ABI)
5. Contract.interface.encodeFunctionData() → ethers.js
6. ContractService.signAndBroadcastTransaction()
7. KmsSigner.signTransaction() → KmsService
8. Provider.broadcastTransaction() → Blockchain
9. TransactionRepository.save() → MySQL
```

---

## 📝 Notas

- As transações de escrita são rastreadas na tabela `transactions` com status
- Funções `view`/`pure` não gastam gas e não criam transações
- ABIs são armazenadas no DynamoDB para escalabilidade
- Contratos deployados são salvos no MySQL com relação ao ABI
- Use a rede Sepolia para testes (configure RPC_URL)
- AWS KMS garante que chaves privadas nunca saem do HSM
- LocalStack simula KMS localmente para desenvolvimento
- S-normalization é crítica para compatibilidade Ethereum

---