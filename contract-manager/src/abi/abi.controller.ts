import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AbiService } from './abi.service';

@Controller('abi')
export class AbiController {
  constructor(private readonly abiService: AbiService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAbi(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const result = await this.abiService.saveAbiToDynamo(file);
    return result;
  }

  @Get()
  async getAbis(@Query('contractName') contractName?: string) {
    const result = await this.abiService.getAbis(contractName);
    return {
      message: 'ABIs encontrados com sucesso.',
      count: result.length,
      data: result,
    };
  }
}
