// ============================================================
// INTEGRATION TESTS — /api/v1/auth
// ============================================================
// Supertest contra la app de Express en memoria + MongoDB Memory Server.
// Archivo de test separado -> instancia propia de MongoMemoryServer, sin
// compartir estado con document.routes.test.ts.
// ============================================================

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app';

let mongod: MongoMemoryServer;

const credentials = { name: 'Gabriel Leal', email: 'notario1@notaria.com', password: 'Notaria2026' };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await mongoose.connection.collection('users').deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Auth Routes — Integration Tests', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should return 201 with valid data', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(credentials);

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe(credentials.email);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should return 409 with a duplicate email', async () => {
      await request(app).post('/api/v1/auth/register').send(credentials);

      const res = await request(app).post('/api/v1/auth/register').send(credentials);

      expect(res.status).toBe(409);
    });

    it('should return 422 with an invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...credentials, email: 'otro@notaria.com', password: 'abc' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 with an accessToken in the response', async () => {
      await request(app).post('/api/v1/auth/register').send(credentials);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: credentials.email, password: credentials.password });

      expect(res.status).toBe(200);
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('should return 401 with an incorrect password', async () => {
      await request(app).post('/api/v1/auth/register').send(credentials);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: credentials.email, password: 'incorrecta' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 200 with a valid token in the Authorization header', async () => {
      await request(app).post('/api/v1/auth/register').send(credentials);
      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: credentials.email, password: credentials.password });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(credentials.email);
    });

    it('should return 401 without a token', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });
  });
});
