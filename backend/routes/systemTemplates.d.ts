declare const router: import("express-serve-static-core").Router;
export declare const TEMPLATE_TYPES: {
    readonly WELCOME: "welcome";
    readonly SUBSCRIPTION_UPGRADE: "subscription_upgrade";
    readonly SUBSCRIPTION_DOWNGRADE: "subscription_downgrade";
    readonly SUBSCRIPTION_CANCELLED: "subscription_cancelled";
    readonly SUBSCRIPTION_PAYMENT_FAILED: "subscription_payment_failed";
    readonly SUBSCRIPTION_TRIAL_ENDING: "subscription_trial_ending";
    readonly PASSWORD_RESET: "password_reset";
    readonly EMAIL_VERIFICATION: "email_verification";
    readonly TEAM_INVITATION: "team_invitation";
    readonly NOTIFICATION: "notification";
    readonly CUSTOM: "custom";
};
export default router;
//# sourceMappingURL=systemTemplates.d.ts.map