import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AdminGuard } from '../auth/admin.guard.js';
import { OfficeService } from './office.service.js';

const deskChangeSchema = z.strictObject({
  active: z.boolean(),
  disabledReason: z.string().trim().max(120).nullish(),
});

@ApiTags('office')
@Controller()
export class OfficeController {
  constructor(private readonly office: OfficeService) {}

  @Get('office')
  plan() {
    return this.office.plan();
  }

  @UseGuards(AdminGuard)
  @Patch('desks/:id')
  update(
    @Param('id', { schema: z.string().min(1).max(64) }) id: string,
    @Body({ schema: deskChangeSchema }) body: z.infer<typeof deskChangeSchema>,
  ) {
    return this.office.update(id, body);
  }
}
