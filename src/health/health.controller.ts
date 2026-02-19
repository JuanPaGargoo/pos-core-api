import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Sistema')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Verifica el estado del sistema' })
  @ApiResponse({
    status: 200,
    description: 'Estado del sistema',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', example: '2026-02-18T12:00:00.000Z' },
            uptime: { type: 'number', example: 123.456 },
          },
        },
        meta: { type: 'object' },
      },
    },
  })
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
  @ApiOperation({ summary: 'Obtiene la versión de la API' })
  @ApiResponse({
    status: 200,
    description: 'Versión de la API',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            version: { type: 'string', example: '0.0.1' },
            name: { type: 'string', example: 'POS Core API' },
            environment: { type: 'string', example: 'development' },
          },
        },
        meta: { type: 'object' },
      },
    },
  })
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
