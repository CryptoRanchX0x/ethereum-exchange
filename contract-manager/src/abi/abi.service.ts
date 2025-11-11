import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AbiService {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName = process.env.DYNAMODB_TABLE_ABI;
    constructor() {
        const config: DynamoDBClientConfig = {};
        if (process.env.AWS_REGION) {
            config.region = process.env.AWS_REGION;
        }
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            config.credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            };
        }

        if (process.env.AWS_ENDPOINT) {
            config.endpoint = process.env.AWS_ENDPOINT;
        }

        const dynamo = new DynamoDBClient(config);
        this.client = DynamoDBDocumentClient.from(dynamo);
    }

    async saveAbiToDynamo(file: Express.Multer.File) {
        const abiJson = file.buffer.toString('utf-8');

        let abiData;
        try {
            abiData = JSON.parse(abiJson);
        } catch {
            throw new BadRequestException('Arquivo JSON inválido.');
        }

        const item = {
            id: uuidv4(),
            contractName: file.originalname.replace('.json', ''),
            createdAt: new Date().toISOString(),
            abi: JSON.stringify(abiData),
        };

        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );

        return {
            message: 'ABI salva com sucesso no DynamoDB.',
            id: item.id,
            contractName: item.contractName,
        };
    }

    async getAbis(contractName?: string) {
        try {
            let params: any = {
                TableName: this.tableName,
            };

            if (contractName) {
                params.FilterExpression = 'contractName = :name';
                params.ExpressionAttributeValues = {
                    ':name': contractName,
                };
            }

            const response = await this.client.send(new ScanCommand(params));
            const items = response.Items || [];

            // Mapear items para o formato esperado
            return items.map((item: any) => ({
                id: item.id,
                contractName: item.contractName,
                createdAt: item.createdAt,
                abi: typeof item.abi === 'string' ? JSON.parse(item.abi) : item.abi,
            }));
        } catch (err) {
            console.error('Erro ao buscar ABIs:', err);
            throw new InternalServerErrorException('Erro ao buscar ABIs no DynamoDB');
        }
    }

    async getAbiById(id: string) {
        try {
            const response = await this.client.send(new GetCommand({
                TableName: this.tableName,
                Key: { id },
            }));

            const item = (response as any).Item;
            if (!item) return null;

            return {
                id: item.id,
                contractName: item.contractName,
                createdAt: item.createdAt,
                abi: typeof item.abi === 'string' ? JSON.parse(item.abi) : item.abi,
            };
        } catch (err) {
            console.error('Erro ao buscar ABI por id:', err);
            throw new InternalServerErrorException('Erro ao buscar ABI no DynamoDB');
        }
    }
}
