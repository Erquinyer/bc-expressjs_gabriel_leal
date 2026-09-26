import { UserModel, type IUser } from '../models/user.model.js';

export async function findUserByEmail(email: string): Promise<IUser | null> {
  return UserModel.findOne({ email }).lean<IUser>().exec();
}

export async function createUser(
  data: Pick<IUser, 'name' | 'email' | 'password' | 'role'>,
): Promise<IUser> {
  const user = new UserModel(data);
  await user.save();
  // Fix sobre el starter: devolver el Document de Mongoose crudo rompe el
  // spread `{ password, ...safeUser }` en auth.service.ts — los campos del
  // schema no quedan como propiedades propias del objeto y `safeUser.email`
  // sale `undefined` (comprobado con un test de integración real). El resto
  // del repositorio ya usa `.lean()`; se alinea createUser con ese mismo
  // contrato (siempre objeto plano).
  return user.toObject() as unknown as IUser;
}

export async function findUserById(id: string): Promise<IUser | null> {
  return UserModel.findById(id).lean<IUser>().exec();
}
