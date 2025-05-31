import { ErrorCode } from '@middlewares/e/ErrorCode';

export const ErrorMessages: { [key in ErrorCode]: string } = {
  // General Errors
  [ErrorCode.UNKNOWN_ERROR]: "Unknown error occurred",
  [ErrorCode.NOT_FOUND]: "Resource not found",
  [ErrorCode.BAD_REQUEST]: "Bad request",
  [ErrorCode.VALIDATION_ERROR]: "Validation error",
  
  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: "Unauthorized access",
  [ErrorCode.FORBIDDEN]: "Access forbidden",
  [ErrorCode.INVALID_CREDENTIALS]: "Invalid credentials provided",
  [ErrorCode.TOKEN_EXPIRED]: "Authentication token has expired",
  [ErrorCode.TOKEN_INVALID]: "Invalid authentication token",
  [ErrorCode.TOKEN_MISSING]: "Authentication token is missing",
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: "Insufficient permissions to access this resource",
  [ErrorCode.ACCOUNT_LOCKED]: "Account has been locked",
  [ErrorCode.ACCOUNT_DISABLED]: "Account has been disabled",
  [ErrorCode.PASSWORD_EXPIRED]: "Password has expired and needs to be reset",
  
  // User Related Errors
  [ErrorCode.USER_NOT_FOUND]: "User not found",
  [ErrorCode.USER_ALREADY_EXISTS]: "User already exists",
  [ErrorCode.USER_CREATION_FAILED]: "Failed to create user",
  [ErrorCode.USER_UPDATE_FAILED]: "Failed to update user",
  [ErrorCode.USER_DELETION_FAILED]: "Failed to delete user",
  [ErrorCode.INVALID_USER_DATA]: "Invalid user data provided",

  [ErrorCode.INVALID_INPUT]: "Invalid prompt input",
  [ErrorCode.QUOTA_EXCEEDED]: "Quota exceeded",

  [ErrorCode.INVALID_AI_RESPONSE] :"INVALID_AI_RESPONSE",
  [ErrorCode.AI_MODEL_NOT_FOUND]: "AI model not found",
  [ErrorCode.AI_MODEL_LOAD_FAILED]: "AI model load failed",
  [ErrorCode.AI_MODEL_TIMEOUT]: "AI model timeout",
  [ErrorCode.AI_RESPONSE_FORMAT_ERROR]: "AI response format error",
  [ErrorCode.AI_SERVICE_UNAVAILABLE]: "AI service unavailable",
};