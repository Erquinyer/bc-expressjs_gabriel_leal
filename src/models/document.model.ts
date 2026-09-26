import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

// ============================================================
// MODELO: Document (trámite notarial)
// ============================================================

export const documentCategories = [
  'escrituras',
  'poderes',
  'testamentos',
  'autenticaciones',
  'actas',
] as const;

export type DocumentCategory = (typeof documentCategories)[number];

export interface IDocument extends MongooseDocument {
  code:           string;
  name:           string;
  category:       DocumentCategory;
  fee:            number;
  availableSlots: number;
  active:         boolean;
  createdBy:      string;
  createdAt:      Date;
  updatedAt:      Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    code:           { type: String, required: true, unique: true, trim: true },
    name:           { type: String, required: true, trim: true },
    category:       { type: String, required: true, enum: documentCategories },
    fee:            { type: Number, required: true, min: 0 },
    availableSlots: { type: Number, default: 0, min: 0 },
    active:         { type: Boolean, default: true },
    createdBy:      { type: String, required: true },
  },
  { timestamps: true },
);

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
