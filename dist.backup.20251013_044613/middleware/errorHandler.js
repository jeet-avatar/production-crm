"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let isOperational = false;
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
        isOperational = error.isOperational;
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    }
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    else if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error;
        if (prismaError.code === 'P2002') {
            statusCode = 409;
            message = 'Duplicate entry';
        }
        else if (prismaError.code === 'P2025') {
            statusCode = 404;
            message = 'Record not found';
        }
        else if (prismaError.code === 'P2003') {
            statusCode = 400;
            message = 'Foreign key constraint violation';
        }
    }
    logger_1.logger.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode,
    });
    const errorResponse = {
        error: error.name || 'Error',
        message,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
    };
    if (process.env.NODE_ENV === 'development' && error.stack) {
        errorResponse.stack = error.stack;
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map