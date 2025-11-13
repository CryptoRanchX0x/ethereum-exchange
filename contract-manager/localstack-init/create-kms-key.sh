#!/bin/bash

echo "Waiting for LocalStack to be ready..."
sleep 5

echo "Creating KMS key for Ethereum signing..."

# Cria uma chave ECC_SECG_P256K1 (secp256k1 - curva usada pelo Ethereum)
KEY_ID=$(awslocal kms create-key \
  --key-spec ECC_SECG_P256K1 \
  --key-usage SIGN_VERIFY \
  --description "Ethereum signing key for smart contract deployment" \
  --query 'KeyMetadata.KeyId' \
  --output text)

if [ -z "$KEY_ID" ]; then
  echo "ERROR: Failed to create KMS key"
  exit 1
fi

echo "KMS Key created successfully!"
echo "Key ID: $KEY_ID"

# Cria um alias para facilitar o acesso
awslocal kms create-alias \
  --alias-name alias/ethereum-signer \
  --target-key-id "$KEY_ID"

echo "Alias 'alias/ethereum-signer' created"

# Obtém a chave pública
PUBLIC_KEY=$(awslocal kms get-public-key --key-id "$KEY_ID" --query 'PublicKey' --output text)

echo "Public Key: $PUBLIC_KEY"

# Salva o Key ID em um arquivo para referência
echo "$KEY_ID" > /tmp/kms-key-id.txt

echo ""
echo "============================================"
echo "KMS setup completed!"
echo "============================================"
echo "Add this to your .env file:"
echo "KMS_KEY_ID=$KEY_ID"
echo "KMS_ENDPOINT=http://localhost:4566"
echo "============================================"
