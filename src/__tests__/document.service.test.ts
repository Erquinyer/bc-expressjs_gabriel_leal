// ============================================================
// UNIT TESTS — document.service.ts
// ============================================================
// document.repository se mockea completo con jest.mock(): estas pruebas
// testean solo la lógica de negocio del service, en aislamiento (sin tocar
// MongoDB real ni MongoDB Memory Server).
// ============================================================

jest.mock('../repositories/document.repository');

import * as documentRepo from '../repositories/document.repository';
import * as documentService from '../services/document.service';
import { AppError } from '../errors/AppError';
import type { IDocument } from '../models/document.model';

const mockFindAll  = documentRepo.findAllDocuments as jest.MockedFunction<typeof documentRepo.findAllDocuments>;
const mockFindById = documentRepo.findDocumentById as jest.MockedFunction<typeof documentRepo.findDocumentById>;
const mockCreate   = documentRepo.createDocument   as jest.MockedFunction<typeof documentRepo.createDocument>;
const mockUpdate   = documentRepo.updateDocument   as jest.MockedFunction<typeof documentRepo.updateDocument>;
const mockDelete   = documentRepo.deleteDocument   as jest.MockedFunction<typeof documentRepo.deleteDocument>;

const documentBase = {
  _id: 'doc-id-123',
  code: 'ESC-001',
  name: 'Escritura de compraventa de inmueble',
  category: 'escrituras',
  fee: 350000,
  availableSlots: 8,
  active: true,
  createdBy: 'user-id-abc',
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as IDocument;

describe('DocumentService — Unit Tests', () => {
  describe('getAll()', () => {
    it('should return all documents', async () => {
      // Arrange
      mockFindAll.mockResolvedValue([documentBase]);

      // Act
      const result = await documentService.getAll();

      // Assert
      expect(result).toEqual([documentBase]);
      expect(mockFindAll).toHaveBeenCalledWith(undefined);
    });

    it('should return empty array when no documents exist', async () => {
      mockFindAll.mockResolvedValue([]);

      const result = await documentService.getAll();

      expect(result).toEqual([]);
    });

    it('should filter by createdBy when provided', async () => {
      mockFindAll.mockResolvedValue([documentBase]);

      await documentService.getAll('user-id-abc');

      expect(mockFindAll).toHaveBeenCalledWith('user-id-abc');
    });
  });

  describe('getById()', () => {
    it('should return the document when found', async () => {
      mockFindById.mockResolvedValue(documentBase);

      const result = await documentService.getById('doc-id-123');

      expect(result).toEqual(documentBase);
      expect(mockFindById).toHaveBeenCalledWith('doc-id-123');
    });

    it('should throw AppError 404 when document does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(documentService.getById('missing-id')).rejects.toMatchObject({
        statusCode: 404,
      });
      await expect(documentService.getById('missing-id')).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('create()', () => {
    const createDto = {
      code: 'ESC-001',
      name: 'Escritura de compraventa de inmueble',
      category: 'escrituras' as const,
      fee: 350000,
    };

    it('should create and return the new document', async () => {
      mockCreate.mockResolvedValue(documentBase);

      const result = await documentService.create(createDto, 'user-id-abc');

      expect(result).toEqual(documentBase);
      expect(mockCreate).toHaveBeenCalledWith(createDto, 'user-id-abc');
    });

    it('should throw AppError 409 when the code already exists', async () => {
      mockCreate.mockRejectedValue({ code: 11000 });

      await expect(documentService.create(createDto, 'user-id-abc')).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });

  describe('update()', () => {
    it('should update and return the document when requester is the owner', async () => {
      mockFindById.mockResolvedValue(documentBase);
      mockUpdate.mockResolvedValue({ ...documentBase, fee: 400000 } as unknown as IDocument);

      const result = await documentService.update(
        'doc-id-123',
        { fee: 400000 },
        'user-id-abc',
        'user',
      );

      expect(result.fee).toBe(400000);
      expect(mockUpdate).toHaveBeenCalledWith('doc-id-123', { fee: 400000 });
    });

    it('should update when requester is admin (not the owner)', async () => {
      mockFindById.mockResolvedValue(documentBase);
      mockUpdate.mockResolvedValue({ ...documentBase, fee: 400000 } as unknown as IDocument);

      const result = await documentService.update(
        'doc-id-123',
        { fee: 400000 },
        'another-user-id',
        'admin',
      );

      expect(result.fee).toBe(400000);
    });

    it('should throw AppError 403 when requester is neither owner nor admin', async () => {
      mockFindById.mockResolvedValue(documentBase);

      await expect(
        documentService.update('doc-id-123', { fee: 1 }, 'another-user-id', 'user'),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should throw AppError 404 when document does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        documentService.update('missing-id', { fee: 1 }, 'user-id-abc', 'user'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('remove()', () => {
    it('should delete the document when it exists', async () => {
      mockFindById.mockResolvedValue(documentBase);
      mockDelete.mockResolvedValue(documentBase);

      await documentService.remove('doc-id-123');

      expect(mockDelete).toHaveBeenCalledWith('doc-id-123');
    });

    it('should throw AppError 404 when document does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(documentService.remove('missing-id')).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });
});
