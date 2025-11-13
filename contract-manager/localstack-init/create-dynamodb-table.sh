#!/usr/bin/env bash
set -euo pipefail

TABLE_NAME="smart-contract-abis"
ENDPOINT="${AWS_ENDPOINT:-http://localhost:4566}"
REGION="${AWS_REGION:-us-east-1}"

# Wait until LocalStack is responding
echo "[localstack-init] waiting for LocalStack endpoint ${ENDPOINT}..."
until curl -s ${ENDPOINT} >/dev/null 2>&1; do
  sleep 1
done

echo "[localstack-init] checking/creating DynamoDB table ${TABLE_NAME}"

# Try using awslocal if available (provided by LocalStack), otherwise use aws cli
if command -v awslocal >/dev/null 2>&1; then
  set +e
  awslocal dynamodb create-table \
    --table-name "${TABLE_NAME}" \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST
  rc=$?
  set -e
  if [ $rc -eq 0 ]; then
    echo "[localstack-init] created DynamoDB table ${TABLE_NAME}"
  else
    echo "[localstack-init] DynamoDB table ${TABLE_NAME} may already exist (awslocal rc=$rc)"
  fi
else
  # Fallback to aws CLI
  set +e
  aws --endpoint-url=${ENDPOINT} --region ${REGION} dynamodb create-table \
    --table-name "${TABLE_NAME}" \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST
  rc=$?
  set -e
  if [ $rc -eq 0 ]; then
    echo "[localstack-init] created DynamoDB table ${TABLE_NAME}"
  else
    echo "[localstack-init] DynamoDB table ${TABLE_NAME} may already exist or aws CLI not available (rc=$rc)"
  fi
fi
