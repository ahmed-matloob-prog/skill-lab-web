import bcrypt from 'bcryptjs';
import { logger } from './logger';
import { PASSWORD_RULES } from '../constants';

/**
 * Hash a plaintext password using bcrypt
 * @param password - The plaintext password to hash
 * @returns Promise<string> - The hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, PASSWORD_RULES.BCRYPT_SALT_ROUNDS);
};

/**
 * Verify a plaintext password against a hashed password
 * @param password - The plaintext password to verify
 * @param hashedPassword - The hashed password to compare against
 * @returns Promise<boolean> - True if password matches, false otherwise
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    logger.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Check if a string is already a bcrypt hash
 * Bcrypt hashes start with $2a$, $2b$, or $2y$
 * @param str - The string to check
 * @returns boolean - True if string appears to be a bcrypt hash
 */
export const isBcryptHash = (str: string): boolean => {
  return /^\$2[aby]\$\d{2}\$/.test(str);
};
