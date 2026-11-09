export interface ValidationResult {
    safe: boolean;
    url: string;
    reason?: string;
    resolvedIp?: string;
}
/**
 * Checks if an IP address is considered private/internal.
 */
export declare function isPrivateIp(ip: string): boolean;
/**
 * Validates a target URL against SSRF attacks.
 * Resolves DNS to check real destination IP addresses.
 */
export declare function validateTargetUrl(rawUrl: string): Promise<ValidationResult>;
//# sourceMappingURL=ssrf.d.ts.map