import { Controller, Get, Param } from '@nestjs/common';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { CepService } from './cep.service';

@Controller('cep')
export class CepController {
  constructor(private readonly cep: CepService) {}

  @Get(':cep')
  @RateLimit({
    name: 'cep.lookup',
    windowMs: 60 * 60 * 1000,
    max: 120,
    keyParts: ['ip', 'path', 'method'],
  })
  async lookup(@Param('cep') cep: string) {
    return this.cep.lookup(cep);
  }
}

