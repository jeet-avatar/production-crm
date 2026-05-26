export declare function validatePhoneNumber(phone: string | null | undefined): {
    isValid: boolean;
    formatted?: string;
    error?: string;
};
export declare function validateEmail(email: string | null | undefined): {
    isValid: boolean;
    formatted?: string;
    error?: string;
};
export declare function validateContactData(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
}): {
    isValid: boolean;
    errors: string[];
};
//# sourceMappingURL=validation.d.ts.map