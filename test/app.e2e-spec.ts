/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * E2E tests for POS Core API — Stage 0
 *
 * Prerequisites:
 *   - Database running with seed data (`pnpm seed`)
 *   - Environment variables configured (.env)
 */
describe('POS Core API (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;
  let refreshToken: string;

  // ────────────────────────────────────────────────
  // Bootstrap
  // ────────────────────────────────────────────────
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════════
  // 1. AUTH FLOW
  // ═══════════════════════════════════════════════
  describe('Auth flow', () => {
    it('POST /auth/login — should login with admin credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'admin', password: 'admin123' })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('POST /auth/login — should reject invalid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'admin', password: 'wrongpassword' })
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    it('POST /auth/login — should reject missing fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'admin' })
        .expect(400);
    });

    it('GET /me — should return authenticated user data', async () => {
      const res = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.username).toBe('admin');
      expect(res.body.data.roles).toBeInstanceOf(Array);
    });

    it('GET /me — should reject without token', async () => {
      await request(app.getHttpServer()).get('/me').expect(401);
    });

    it('GET /me/permissions — should return permissions for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/permissions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data).toContain('users.create');
    });

    it('POST /auth/refresh — should refresh token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      // Use new tokens from here on
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('POST /auth/logout — should logout successfully', async () => {
      // Login again to get a disposable token pair
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'admin', password: 'admin123' })
        .expect(201);

      const tmpAccess = loginRes.body.data.accessToken;
      const tmpRefresh = loginRes.body.data.refreshToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${tmpAccess}`)
        .send({ refreshToken: tmpRefresh })
        .expect(201);
    });
  });

  // ═══════════════════════════════════════════════
  // 2. PROTECTED ROUTES — basic access
  // ═══════════════════════════════════════════════
  describe('Protected routes', () => {
    it('GET /users — should return users list', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /roles — should return roles list', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    });

    it('GET /permissions — should return all permissions', async () => {
      const res = await request(app.getHttpServer())
        .get('/permissions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(20);
    });
  });

  // ═══════════════════════════════════════════════
  // 3. USER CRUD → assign role → assign branch
  // ═══════════════════════════════════════════════
  describe('User CRUD + role & branch assignment', () => {
    let createdUserId: number;
    const ts = Date.now();

    it('POST /users — should create a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E Test User',
          username: `e2e_user_${ts}`,
          email: `e2e_${ts}@test.com`,
          password: 'testpass123',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('E2E Test User');
      createdUserId = res.body.data.id;
    });

    it('GET /users/:id — should get the created user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(createdUserId);
      expect(res.body.data.username).toBe(`e2e_user_${ts}`);
    });

    it('PUT /users/:id — should update the user', async () => {
      const res = await request(app.getHttpServer())
        .put(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Updated User' })
        .expect(200);

      expect(res.body.data.name).toBe('E2E Updated User');
    });

    it('PUT /users/:id/roles — should assign cashier role', async () => {
      // Find cashier role id
      const rolesRes = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const cashier = rolesRes.body.data.find(
        (r: { name: string }) => r.name === 'cashier',
      );
      expect(cashier).toBeDefined();

      const res = await request(app.getHttpServer())
        .put(`/users/${createdUserId}/roles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ roleIds: [cashier.id] })
        .expect(200);

      expect(res.body.data.roles).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'cashier' })]),
      );
    });

    it('PATCH /users/:id/status — should deactivate user', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.data.isActive).toBe(false);
    });

    it('PATCH /users/:id/status — should reactivate user', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(res.body.data.isActive).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════
  // 4. BRANCH → WAREHOUSE → LOCATION
  // ═══════════════════════════════════════════════
  describe('Branch → Warehouse → Location flow', () => {
    let branchId: number;
    let warehouseId: number;
    let locationId: number;
    const ts = Date.now();

    it('POST /branches — should create a branch', async () => {
      const res = await request(app.getHttpServer())
        .post('/branches')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E Branch',
          code: `E2E-${ts}`,
          address: 'Test Address 123',
          phone: '555-1234',
          timezone: 'America/Mexico_City',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      branchId = res.body.data.id;
    });

    it('POST /warehouses — should create a warehouse in the branch', async () => {
      const res = await request(app.getHttpServer())
        .post('/warehouses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          branchId,
          name: 'E2E Warehouse',
          code: `WH-${ts}`,
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      warehouseId = res.body.data.id;
    });

    it('POST /locations — should create a location (zone) in the warehouse', async () => {
      const res = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          warehouseId,
          name: 'E2E Zone A',
          code: `ZN-${ts}`,
          type: 'zone',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      locationId = res.body.data.id;
    });

    it('POST /locations — should create a child location (rack)', async () => {
      const res = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          warehouseId,
          name: 'E2E Rack 1',
          code: `RK-${ts}`,
          type: 'rack',
          parentId: locationId,
        })
        .expect(201);

      expect(res.body.data.parentId).toBe(locationId);
    });

    it('PUT /users/:id/branches — should assign branch to admin user', async () => {
      const meRes = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const adminId = meRes.body.data.id;

      const res = await request(app.getHttpServer())
        .put(`/users/${adminId}/branches`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          branches: [{ branchId, isDefault: true }],
        })
        .expect(200);

      expect(res.body.data.branches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: branchId, isDefault: true }),
        ]),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // 5. AUDIT LOGS — verify entries exist
  // ═══════════════════════════════════════════════
  describe('Audit logs', () => {
    it('GET /audit-logs — should contain recent entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify CREATE actions from the tests above
      const creates = res.body.data.filter(
        (l: { action: string }) => l.action === 'CREATE',
      );
      expect(creates.length).toBeGreaterThan(0);
    });

    it('GET /audit-logs?action=CREATE — should filter by action', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs?action=CREATE')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      res.body.data.forEach((log: { action: string }) => {
        expect(log.action).toBe('CREATE');
      });
    });
  });

  // ═══════════════════════════════════════════════
  // 6. PAYMENT METHODS
  // ═══════════════════════════════════════════════
  describe('Payment methods', () => {
    it('GET /payment-methods — should include seeded methods', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-methods')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      const names = res.body.data.map((pm: { name: string }) => pm.name);
      expect(names).toContain('Efectivo');
      expect(names).toContain('Tarjeta');
      expect(names).toContain('Transferencia');
    });
  });

  // ═══════════════════════════════════════════════
  // 7. SETTINGS
  // ═══════════════════════════════════════════════
  describe('Settings', () => {
    it('GET /settings — should return global settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════
  // 8. STANDARDIZED ERROR FORMAT
  // ═══════════════════════════════════════════════
  describe('Error format', () => {
    it('should return standard error for 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBeDefined();
      expect(res.body.error.message).toBeDefined();
      expect(res.body.error.details).toBeInstanceOf(Array);
    });

    it('should return validation errors for bad input', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Missing required fields' })
        .expect(400);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('should reject unknown properties (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: 'admin', password: 'admin123', hacked: true })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });
});
