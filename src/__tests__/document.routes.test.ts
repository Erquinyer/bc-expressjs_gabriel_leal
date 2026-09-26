// ============================================================
// INTEGRATION TESTS — /api/v1/documents
// ============================================================
// Supertest contra la app de Express en memoria (sin app.listen) +
// MongoDB Memory Server (sin tocar ninguna base de datos real).
// ============================================================

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../app';
import { UserModel } from '../models/user.model';

let mongod: MongoMemoryServer;
let userToken: string;
let adminToken: string;

const validDocument = {
  code: 'ESC-001',
  name: 'Escritura de compraventa de inmueble',
  category: 'escrituras',
  fee: 350000,
  availableSlots: 8,
  active: true,
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Notario User', email: 'user@notaria.com', password: 'Notaria2026' });
  const userLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'user@notaria.com', password: 'Notaria2026' });
  userToken = userLogin.body.accessToken;

  await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Notario Admin', email: 'admin@notaria.com', password: 'Notaria2026' });
  // No hay endpoint para crear admins: se registra como 'user' normal y se
  // eleva el rol directamente en la base de datos (memory server, no real).
  await UserModel.updateOne({ email: 'admin@notaria.com' }, { role: 'admin' });
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@notaria.com', password: 'Notaria2026' });
  adminToken = adminLogin.body.accessToken;
});

afterEach(async () => {
  await mongoose.connection.collection('documents').deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Documents Routes — Integration Tests', () => {
  describe('GET /api/v1/documents', () => {
    it('should return 200 and an empty array initially', async () => {
      const res = await request(app).get('/api/v1/documents');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('POST /api/v1/documents', () => {
    it('should return 201 with valid data and a token', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validDocument);

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe(validDocument.code);
      expect(res.body.data.createdBy).toBeDefined();
    });

    it('should return 401 without a token', async () => {
      const res = await request(app).post('/api/v1/documents').send(validDocument);

      expect(res.status).toBe(401);
    });

    it('should return 422 with invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: '', name: 'x', category: 'invalido', fee: -5 });

      expect(res.status).toBe(422);
    });

    it('should return 409 when the code already exists', async () => {
      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validDocument);

      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validDocument);

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/documents/:id', () => {
    it('should return 200 with an existing document', async () => {
      const created = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validDocument);

      const res = await request(app).get(`/api/v1/documents/${created.body.data._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe(validDocument.code);
    });

    it('should return 404 with a non-existent ID', async () => {
      const res = await request(app).get('/api/v1/documents/000000000000000000000000');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/documents/:id', () => {
    it('should return 200 when the owner updates', async () => {
      const created = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validDocument);

      const res = await request(app)
        .put(`/api/v1/documents/${created.body.data._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fee: 400000 });

      expect(res.status).toBe(200);
      expect(res.body.data.fee).toBe(400000);
      // El PATCH parcial no debe resetear campos con default omitidos
      // (hallazgo de semana 08, aplicado aquí desde el diseño inicial).
      expect(res.body.data.availableSlots).toBe(validDocument.availableSlots);
      expect(res.body.data.active).toBe(true);
    });

    it('should return 403 when a non-owner, non-admin user updates', async () => {
      const created = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDocument);

      const res = await request(app)
        .put(`/api/v1/documents/${created.body.data._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fee: 1 });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/documents/:id', () => {
    it('should return 403 when the requester is not admin', async () => {
      const created = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validDocument);

      const res = await request(app)
        .delete(`/api/v1/documents/${created.body.data._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 204 when an admin deletes', async () => {
      const created = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validDocument);

      const res = await request(app)
        .delete(`/api/v1/documents/${created.body.data._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      const getRes = await request(app).get(`/api/v1/documents/${created.body.data._id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
