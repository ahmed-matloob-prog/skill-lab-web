import validator from 'validator';

/**
 * Sanitize user input to prevent XSS attacks
 * Escapes HTML characters
 */
export const sanitizeString = (input: string): string => {
  return validator.escape(input.trim());
};

/**
 * Validate email address format
 */
export const validateEmail = (email: string): boolean => {
  return validator.isEmail(email);
};

/**
 * Validate student ID format
 * Allows alphanumeric characters and hyphens
 */
export const validateStudentId = (id: string): boolean => {
  return /^[A-Za-z0-9-]+$/.test(id);
};

/**
 * Validate student name
 * Must be 2-100 characters, letters (including Arabic) and spaces only
 */
export const validateName = (name: string): boolean => {
  return (
    name.length >= 2 &&
    name.length <= 100 &&
    /^[A-Za-z\u0600-\u06FF\s]+$/.test(name)
  );
};

/**
 * Validate username
 * Must be 3-50 characters, alphanumeric and underscores only
 */
export const validateUsername = (username: string): boolean => {
  return (
    username.length >= 3 &&
    username.length <= 50 &&
    /^[A-Za-z0-9_]+$/.test(username)
  );
};

/**
 * Validate password strength
 * Returns object with validation result and error message if invalid
 */
export const validatePassword = (
  password: string
): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
    };
  }

  return { valid: true };
};

/**
 * Validate phone number (basic international format)
 */
export const validatePhone = (phone: string): boolean => {
  // Allows +, -, spaces, and numbers
  return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(
    phone
  );
};

/**
 * Validate year (1-6 for your educational system)
 */
export const validateYear = (year: number): boolean => {
  return Number.isInteger(year) && year >= 1 && year <= 6;
};

/**
 * Validate score (must be between 0 and maxScore)
 */
export const validateScore = (score: number, maxScore: number): boolean => {
  return score >= 0 && score <= maxScore;
};
