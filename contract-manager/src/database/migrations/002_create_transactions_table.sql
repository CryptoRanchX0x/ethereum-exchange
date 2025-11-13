-- Criar tabela transactions
-- Data: 2025-11-13

CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID da transação',
  id_smart_contract CHAR(36) NOT NULL COMMENT 'UUID do smart contract',
  tx_hash CHAR(66) NOT NULL COMMENT 'Hash da transação',
  status ENUM('ENVIADA', 'PENDENTE', 'CONCLUIDA', 'ERROR') NOT NULL DEFAULT 'ENVIADA' COMMENT 'Status da transação',
  function_name VARCHAR(100) NOT NULL COMMENT 'Nome da função chamada',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  UNIQUE INDEX uq_tx_hash (tx_hash),
  INDEX idx_id_smart_contract (id_smart_contract),
  INDEX idx_status (status),
  INDEX idx_function_name (function_name),
  CONSTRAINT fk_transactions_smart_contract 
    FOREIGN KEY (id_smart_contract) 
    REFERENCES smart_contract(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de transações de chamadas de funções';