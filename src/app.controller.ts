import { Controller, Get } from '@nestjs/common';
import { Public } from './metadata';
@Controller()
export class AppController {
  @Public()
  @Get('health')
  health() {
    return 'Up';
  }
}
