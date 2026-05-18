// src/lib/api/user.ts

import { apiClient } from './client';
import { SocialProvider, User } from '@/types';

/**
 * Obtener perfil del usuario actual
 */
export async function getUserProfile(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/profile/');
  return data;
}

/**
 * Actualizar perfil del usuario
 */
export async function updateUserProfile(userData: {
  first_name?: string;
  last_name?: string;
  phone?: string;
}): Promise<User> {
  const { data } = await apiClient.patch<User>('/auth/profile/', userData);
  return data;
}

/**
 * Cambiar contraseña del usuario
 */
export async function changePassword(passwordData: {
  current_password: string;
  new_password: string;
  new_password2: string;
}): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(
    '/auth/change-password/',
    passwordData
  );
  return data;
}

/**
 * Desvincular cuenta social
 */
export async function disconnectSocialAccount(provider: SocialProvider): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(
    `/auth/social/disconnect/${provider}/`
  );
  return data;
}

/**
 * Eliminar cuenta del usuario
 */
export async function deleteAccount(password: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(
    '/auth/delete-account/',
    { password }
  );
  return data;
}
