import { account, ID } from '@/shared/lib/appwrite/client';

export async function login(email: string, password: string) {
  await account.createEmailPasswordSession(email, password);
  const u = await account.get();
  return { $id: u.$id, email: u.email, name: u.name };
}

export async function register(email: string, password: string) {
  await account.create(ID.unique(), email, password);
  await account.createEmailPasswordSession(email, password);
  const u = await account.get();
  return { $id: u.$id, email: u.email, name: u.name };
}

export async function logout() {
  await account.deleteSession('current');
}

export async function getCurrentUser() {
  const u = await account.get();
  return { $id: u.$id, email: u.email, name: u.name };
}
