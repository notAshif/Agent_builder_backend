export class AppError extends Error {
    statusCode: number;
    code: string;

    constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = "AppError";
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super(message, 404, "NOT_FOUND");
    }
}

export class ValidateError extends AppError {
    constructor(message = "Validation failed") {
        super(message, 422, "VALIDATION_ERROR");
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized Access") {
        super(message, 401, "UNAUTHORIZED");
    }
}

export class ConflictError extends AppError {
    constructor(message = "Resources Already exists") {
        super(message, 409, "CONFLICT");
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden") {
        super(message, 403, "FORBIDDEN");
    }
}
