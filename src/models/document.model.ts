import mongoose, { Document as MongooseDocument, Schema, Types } from 'mongoose';

// ============================================
// MODELO: Document (trámite notarial) — recurso principal protegido por JWT
// ============================================

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
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    code: {
      type: String,
      required: [true, 'code es requerido'],
      trim: true,
      unique: true,
      maxlength: 30,
    },
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      maxlength: 150,
    },
    category: {
      type: String,
      required: [true, 'category es requerida'],
      enum: documentCategories,
    },
    fee: {
      type: Number,
      required: [true, 'fee es requerido'],
      min: 0,
    },
    availableSlots: {
      type: Number,
      default: 0,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);
