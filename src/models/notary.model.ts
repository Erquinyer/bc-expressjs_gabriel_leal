// ============================================
// MODELO: Notary (entidad secundaria, sin referencias)
// ============================================
import { Schema, model } from 'mongoose';

export interface INotary {
  name: string;
  licenseNumber: string;
  city: string;
}

const notarySchema = new Schema<INotary>(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      maxlength: 150,
    },
    licenseNumber: {
      type: String,
      required: [true, 'licenseNumber es requerido'],
      trim: true,
      unique: true,
      maxlength: 30,
    },
    city: {
      type: String,
      required: [true, 'city es requerida'],
      trim: true,
      maxlength: 100,
    },
  },
  { timestamps: true },
);

export const Notary = model<INotary>('Notary', notarySchema);
