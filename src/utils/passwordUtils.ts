import bcrypt from 'bcryptjs';

/**
 * Hash a plaintext password using bcrypt
 * @param password - The plaintext password to hash
 * @returns Promise<string> - The hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10; // Cost factor - higher = more secure but slower
  return await bcrypt.hash(password, saltRounds);
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
    console.error('Error verifying password:', error);
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
