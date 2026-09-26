import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError } from '../errors/AppError';
import * as usersRepository from '../repositories/users.repository';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { RegisterDto, LoginDto } from '../schemas/auth.schema';
import { IUser } from '../models/user.model';

const SALT_ROUNDS = 10;
const COOKIE_ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 minutos
const COOKIE_REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface TokenCookieOptions {
  accessToken: string;
  refreshToken: string;
  accessMaxAge: number;
  refreshMaxAge: number;
}

// Fix sobre el starter: el refresh token es un JWT, no una contraseña de
// baja entropía — bcrypt.hash()/compare() TRUNCA su entrada a 72 bytes, y
// dos JWT consecutivos del mismo usuario comparten un prefijo (mismo header
// + mismo `sub` + `iat`/`exp` casi idénticos) que supera esos 72 bytes.
// Comprobado con curl real: bcrypt.compare(tokenViejo, hashDelNuevo)
// devolvía true, así que el token "rotado" seguía sirviendo para refrescar
// — la rotación quedaba completamente rota. SHA-256 (longitud fija, sin
// truncar) es lo apropiado para hashear un secreto ya aleatorio como este;
// bcrypt se reserva para la contraseña del usuario.
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function tokensMatch(incomingToken: string, storedHash: string): boolean {
  const incomingHash = Buffer.from(hashToken(incomingToken), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  if (incomingHash.length !== stored.length) return false;
  return crypto.timingSafeEqual(incomingHash, stored);
}

export async function register(dto: RegisterDto): Promise<IUser> {
  const existing = await usersRepository.findByEmail(dto.email);
  if (existing) throw new AppError(409, 'El email ya está registrado');

  const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
  return usersRepository.create({ ...dto, password: hashedPassword });
}

export async function login(dto: LoginDto): Promise<TokenCookieOptions> {
  const user = await usersRepository.findByEmailWithPassword(dto.email);

  // Mismo mensaje para email no encontrado Y contraseña incorrecta
  // — previene user enumeration attacks
  if (!user) throw new AppError(401, 'Credenciales inválidas');

  const isMatch = await bcrypt.compare(dto.password, user.password);
  if (!isMatch) throw new AppError(401, 'Credenciales inválidas');

  const payload = { sub: user._id.toString(), email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ sub: user._id.toString() });

  // Almacenar HASH del refresh token — nunca el token en claro
  const hashedRefresh = hashToken(refreshToken);
  await usersRepository.updateRefreshToken(user._id.toString(), hashedRefresh);

  return {
    accessToken,
    refreshToken,
    accessMaxAge: COOKIE_ACCESS_MAX_AGE,
    refreshMaxAge: COOKIE_REFRESH_MAX_AGE,
  };
}

export async function refresh(incomingToken: string): Promise<TokenCookieOptions> {
  // 1. Verificar firma y expiración del refresh token
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(incomingToken) as { sub: string };
  } catch {
    throw new AppError(401, 'Refresh token inválido o expirado');
  }

  // 2. Cargar usuario con su hash de refresh token
  const user = await usersRepository.findByIdWithTokens(payload.sub);
  if (!user || !user.refreshToken) {
    throw new AppError(401, 'Sesión no válida');
  }

  // 3. Comparar token recibido con hash almacenado
  const isValid = tokensMatch(incomingToken, user.refreshToken);
  if (!isValid) throw new AppError(401, 'Refresh token no coincide');

  // 4. Rotar: generar nuevos tokens
  const newPayload = { sub: user._id.toString(), email: user.email, role: user.role };
  const newAccessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken({ sub: user._id.toString() });

  // 5. Guardar nuevo hash, invalidar el anterior
  const newHashedRefresh = hashToken(newRefreshToken);
  await usersRepository.updateRefreshToken(user._id.toString(), newHashedRefresh);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    accessMaxAge: COOKIE_ACCESS_MAX_AGE,
    refreshMaxAge: COOKIE_REFRESH_MAX_AGE,
  };
}

export async function logout(userId: string): Promise<void> {
  // Invalidar refresh token en la base de datos
  await usersRepository.updateRefreshToken(userId, undefined);
}

export async function getMe(userId: string): Promise<IUser> {
  const user = await usersRepository.findById(userId);
  if (!user) throw new AppError(404, 'Usuario no encontrado');
  return user;
}
