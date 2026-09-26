import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError } from '../errors/AppError.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByIdWithRefreshToken,
  updateRefreshToken,
} from '../repositories/users.repository.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import type { RegisterDto, LoginDto } from '../schemas/auth.schema.js';

// ============================================
// Fix sobre el starter — dos problemas reales encontrados probando el flujo
// completo con curl (documentados con evidencia en el README):
//
// 1. updateRefreshToken() guardaba el JWT del refresh token EN CLARO en la
//    base de datos (un leak de la base de datos entregaría tokens
//    utilizables directamente).
// 2. refreshTokens() nunca comparaba el token recibido contra ningún valor
//    almacenado: solo verificaba la firma/expiración del JWT y emitía
//    tokens nuevos para el `sub` del payload. Como resultado, logout()
//    (que pone refreshToken en null) no invalidaba nada en la práctica —
//    cualquier refresh token emitido antes seguía sirviendo hasta su propia
//    expiración (7 días), aunque el usuario ya hubiera cerrado sesión.
//
// Fix: se guarda un hash SHA-256 del refresh token (no bcrypt — el mismo
// problema de truncamiento a 72 bytes de semana 07 aplica aquí igual) y
// refreshTokens() ahora sí compara el token recibido contra ese hash antes
// de rotar. logout() vuelve a tener efecto real.
// ============================================

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function tokensMatch(incomingToken: string, storedHash: string): boolean {
  const incomingHash = Buffer.from(hashToken(incomingToken), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  if (incomingHash.length !== stored.length) return false;
  return crypto.timingSafeEqual(incomingHash, stored);
}

export async function register(dto: RegisterDto) {
  const existing = await findUserByEmail(dto.email);
  if (existing) throw new AppError(409, 'Email already registered');

  const hashed = await bcrypt.hash(dto.password, 12);
  const user = await createUser({ ...dto, password: hashed });
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

export async function login(dto: LoginDto) {
  const user = await findUserByEmail(dto.email);
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(dto.password, user.password);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken(user._id.toString());
  await updateRefreshToken(user._id.toString(), hashToken(refreshToken));

  return { accessToken, refreshToken, role: user.role };
}

export async function refreshTokens(token: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const user = await findUserByIdWithRefreshToken(payload.sub);
  if (!user || !user.refreshToken) throw new AppError(401, 'Session invalid');

  if (!tokensMatch(token, user.refreshToken)) {
    throw new AppError(401, 'Refresh token does not match');
  }

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  const newRefreshToken = signRefreshToken(user._id.toString());
  await updateRefreshToken(user._id.toString(), hashToken(newRefreshToken));

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string) {
  await updateRefreshToken(userId, null);
}

export async function getMe(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new AppError(404, 'User not found');
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}
