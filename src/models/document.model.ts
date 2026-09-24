// ============================================
// MODELO: Document (entidad principal, con referencia a Notary)
// ============================================
import { Schema, model, Types } from 'mongoose';

export const documentCategories = [
  'escrituras',
  'poderes',
  'testamentos',
  'autenticaciones',
  'actas',
] as const;

export type DocumentCategory = (typeof documentCategories)[number];

export interface IDocument {
  code: string;
  name: string;
  category: DocumentCategory;
  fee: number;
  availableSlots: number;
  active: boolean;
  notary: Types.ObjectId;
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
    notary: {
      type: Schema.Types.ObjectId,
      ref: 'Notary',
      required: [true, 'La notaría es requerida'],
    },
  },
  { timestamps: true },
);

export const Document = model<IDocument>('Document', documentSchema);
