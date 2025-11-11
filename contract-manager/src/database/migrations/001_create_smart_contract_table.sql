-- Criar tabela smart_contract
-- Data: 2025-11-11

CREATE TABLE IF NOT EXISTS smart_contract (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID do contrato',
  name VARCHAR(100) NOT NULL COMMENT 'Nome do contrato',
  address CHAR(42) NOT NULL COMMENT 'Endereço on-chain do contrato',
  tx_hash CHAR(66) NOT NULL COMMENT 'Hash da transação de deploy',
  id_abi CHAR(36) NOT NULL COMMENT 'UUID da ABI armazenada no DynamoDB',
  ativo BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Status do contrato',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  INDEX idx_name (name),
  UNIQUE INDEX uq_address (address),
  UNIQUE INDEX uq_tx_hash (tx_hash),
  INDEX idx_id_abi (id_abi),
  INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de contratos inteligentes';
