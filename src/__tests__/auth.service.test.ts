// ============================================================
// UNIT TESTS — auth.service.ts
// ============================================================
// users.repository se mockea completo con jest.mock(): bcrypt se usa real
// (no es una dependencia externa de datos, es la lógica que se quiere
// verificar — que hash/compare realmente funcionen juntos).
// ============================================================

jest.mock('../repositories/users.repository');

import bcrypt from 'bcrypt';
import * as usersRepo from '../repositories/users.repository';
import * as authService from '../services/auth.service';
import { AppError } from '../errors/AppError';
import type { IUser } from '../models/user.model';

const mockFindByEmail = usersRepo.findUserByEmail as jest.MockedFunction<typeof usersRepo.findUserByEmail>;
const mockCreateUser  = usersRepo.createUser as jest.MockedFunction<typeof usersRepo.createUser>;
const mockFindById    = usersRepo.findUserById as jest.MockedFunction<typeof usersRepo.findUserById>;

const registerDto = { name: 'Gabriel Leal', email: 'notario1@notaria.com', password: 'Notaria2026' };

describe('AuthService — Unit Tests', () => {
  describe('register()', () => {
    it('should hash the password and create the user when email is not taken', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreateUser.mockImplementation(async (data) => ({
        _id: 'user-id-1',
        ...data,
      }) as unknown as IUser);

      const result = await authService.register(registerDto);

      expect(mockCreateUser).toHaveBeenCalledTimes(1);
      const createdArg = mockCreateUser.mock.calls[0]![0];
      expect(createdArg.password).not.toBe(registerDto.password);
      expect(await bcrypt.compare(registerDto.password, createdArg.password)).toBe(true);
      expect(result).not.toHaveProperty('password');
      expect(result['email']).toBe(registerDto.email);
    });

    it('should throw AppError 409 when the email is already registered', async () => {
      mockFindByEmail.mockResolvedValue({ email: registerDto.email } as unknown as IUser);

      await expect(authService.register(registerDto)).rejects.toBeInstanceOf(AppError);
      await expect(authService.register(registerDto)).rejects.toMatchObject({ statusCode: 409 });
      expect(mockCreateUser).not.toHaveBeenCalled();
    });
  });

  describe('login()', () => {
    it('should return an accessToken with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Notaria2026', 12);
      mockFindByEmail.mockResolvedValue({
        _id: 'user-id-1',
        email: registerDto.email,
        password: hashedPassword,
        role: 'user',
      } as unknown as IUser);

      const result = await authService.login({ email: registerDto.email, password: 'Notaria2026' });

      expect(result).toHaveProperty('accessToken');
      expect(typeof result.accessToken).toBe('string');
    });

    it('should throw AppError 401 with an invalid password', async () => {
      const hashedPassword = await bcrypt.hash('Notaria2026', 12);
      mockFindByEmail.mockResolvedValue({
        _id: 'user-id-1',
        email: registerDto.email,
        password: hashedPassword,
        role: 'user',
      } as unknown as IUser);

      await expect(
        authService.login({ email: registerDto.email, password: 'incorrecta' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw AppError 401 when the email does not exist', async () => {
      mockFindByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nadie@notaria.com', password: 'cualquiera' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('getMe()', () => {
    it('should return the user without the password field', async () => {
      mockFindById.mockResolvedValue({
        _id: 'user-id-1',
        name: 'Gabriel Leal',
        email: registerDto.email,
        password: 'hashed',
        role: 'user',
      } as unknown as IUser);

      const result = await authService.getMe('user-id-1');

      expect(result).not.toHaveProperty('password');
      expect(result['email']).toBe(registerDto.email);
    });

    it('should throw AppError 404 when the user does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(authService.getMe('missing-id')).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
