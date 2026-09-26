import type { DocumentCategory } from '../models/document.model.js';

export type UserRole = 'user' | 'admin';

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPayload {
  sub: string;
  role: UserRole;
}

export interface CreateDocumentDto {
  code: string;
  name: string;
  category: DocumentCategory;
  fee: number;
  availableSlots?: number;
  active?: boolean;
}

export interface UpdateDocumentDto {
  code?: string;
  name?: string;
  category?: DocumentCategory;
  fee?: number;
  availableSlots?: number;
  active?: boolean;
}
