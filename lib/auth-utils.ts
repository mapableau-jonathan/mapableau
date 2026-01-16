/**
 * Shared authentication utilities
 * Streamlined authentication helpers for login and registration
 */

export interface AuthError {
  message: string;
  field?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate registration data
 */
export function validateRegisterData(data: RegisterData): {
  valid: boolean;
  errors: AuthError[];
} {
  const errors: AuthError[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push({ message: "Name must be at least 2 characters", field: "name" });
  }

  if (!data.email || !validateEmail(data.email)) {
    errors.push({ message: "Please enter a valid email address", field: "email" });
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.push(
      ...passwordValidation.errors.map((msg) => ({
        message: msg,
        field: "password",
      }))
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate login data
 */
export function validateLoginData(data: LoginData): {
  valid: boolean;
  errors: AuthError[];
} {
  const errors: AuthError[] = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push({ message: "Please enter a valid email address", field: "email" });
  }

  if (!data.password || data.password.length === 0) {
    errors.push({ message: "Password is required", field: "password" });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Register a new user
 */
export async function registerUser(data: RegisterData): Promise<{
  success: boolean;
  error?: string;
  userId?: string;
}> {
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const responseData = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: responseData.error || "Registration failed",
      };
    }

    return {
      success: true,
      userId: responseData.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
