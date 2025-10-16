"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePhoneNumber = validatePhoneNumber;
exports.validateEmail = validateEmail;
exports.validateContactData = validateContactData;
function validatePhoneNumber(phone) {
    if (!phone || phone.trim() === '') {
        return { isValid: true };
    }
    const trimmedPhone = phone.trim();
    const patterns = [
        /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})(\s?(x|ext\.?|extension)\s?([0-9]{1,5}))?$/i,
        /^\+[1-9]\d{1,14}$/,
        /^\+?[1-9]\d{0,3}[-.\s]?\(?[0-9]{1,4}\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}(\s?(x|ext\.?|extension)\s?([0-9]{1,5}))?$/i,
    ];
    const isValidFormat = patterns.some(pattern => pattern.test(trimmedPhone));
    if (!isValidFormat) {
        return {
            isValid: false,
            error: 'Invalid phone number format. Please use a valid format like: (555) 123-4567, +1-555-123-4567, or +44 20 1234 5678',
        };
    }
    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return {
            isValid: false,
            error: 'Phone number must contain between 10 and 15 digits',
        };
    }
    return {
        isValid: true,
        formatted: trimmedPhone,
    };
}
function validateEmail(email) {
    if (!email || email.trim() === '') {
        return { isValid: true };
    }
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(trimmedEmail)) {
        return {
            isValid: false,
            error: 'Invalid email address format',
        };
    }
    return {
        isValid: true,
        formatted: trimmedEmail,
    };
}
function validateContactData(data) {
    const errors = [];
    if (!data.firstName || !data.firstName.trim()) {
        errors.push('First name is required');
    }
    if (!data.lastName || !data.lastName.trim()) {
        errors.push('Last name is required');
    }
    if (data.email) {
        const emailValidation = validateEmail(data.email);
        if (!emailValidation.isValid) {
            errors.push(emailValidation.error || 'Invalid email');
        }
    }
    if (data.phone) {
        const phoneValidation = validatePhoneNumber(data.phone);
        if (!phoneValidation.isValid) {
            errors.push(phoneValidation.error || 'Invalid phone number');
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=validation.js.map