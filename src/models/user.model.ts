import mongoose, { Schema, Document } from 'mongoose';
import type { UserRole } from '../types/index.js';

export interface IUser extends Document {
  name:      string;
  email:     string;
  password:  string;
  role:      UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true },
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
