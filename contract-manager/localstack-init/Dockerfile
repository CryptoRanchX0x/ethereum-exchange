FROM localstack/localstack:latest

# Copy init scripts into LocalStack init directory and make executable
COPY create-dynamodb-table.sh /etc/localstack/init/ready.d/create-dynamodb-table.sh
RUN chmod +x /etc/localstack/init/ready.d/create-dynamodb-table.sh
