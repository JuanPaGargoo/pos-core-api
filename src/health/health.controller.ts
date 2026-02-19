import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      meta: {},
    };
  }

  @Get('version')
  getVersion() {
    return {
      data: {
        version: process.env.npm_package_version || '0.0.1',
        name: 'POS Core API',
        environment: process.env.NODE_ENV || 'development',
      },
      meta: {},
    };
  }
}
