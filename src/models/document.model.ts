import { Schema, model, Document as MongooseDocument } from 'mongoose';

// ============================================
// MODELO: Document (trámite notarial) — recurso principal con RBAC
// ============================================
// createdBy guarda el ID del usuario que creó el trámite: permite que el
// dueño edite SU trámite (PATCH), pero solo admin puede eliminarlo (DELETE).

export const documentCategories = [
  'escrituras',
  'poderes',
  'testamentos',
  'autenticaciones',
  'actas',
] as const;

export type DocumentCategory = (typeof documentCategories)[number];

export interface IDocument extends MongooseDocument {
  code: string;
  name: string;
  category: DocumentCategory;
  fee: number;
  availableSlots: number;
  active: boolean;
  createdBy: string; // user ID — do NOT remove
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    code: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, required: true, enum: documentCategories },
    fee: { type: Number, required: true, min: 0 },
    availableSlots: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    createdBy: { type: String, required: true }, // user ID
  },
  { timestamps: true }
);

export const DocumentModel = model<IDocument>('Document', documentSchema);
