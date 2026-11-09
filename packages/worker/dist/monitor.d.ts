import { type Browser } from 'playwright';
export interface MonitorTarget {
    id: string;
    url: string;
    pixelId: string;
    expectedEvents: string[];
}
export interface ObservedEvent {
    name: string;
    pixelId?: string;
    source: 'js_fbq' | 'network_request' | 'noscript_img';
    payload?: Record<string, any>;
    timestamp: string;
}
export interface DuplicateEventSuspicion {
    eventName: string;
    count: number;
    reason: string;
}
export interface MonitorCheckResult {
    status: 'passed' | 'failed' | 'warning' | 'inconclusive';
    pixelDetected: boolean;
    pixelIdMatched: boolean;
    detectedPixelIds: string[];
    eventsObserved: ObservedEvent[];
    networkRequestsObserved: number;
    duplicateEventsSuspected: DuplicateEventSuspicion[];
    errorMessage?: string;
    rawLog?: string;
    durationMs: number;
}
export declare function getBrowser(): Promise<Browser>;
export declare function closeBrowser(): Promise<void>;
/**
 * Executes a Meta Pixel monitoring check on a target website.
 */
export declare function executePixelCheck(target: MonitorTarget): Promise<MonitorCheckResult>;
//# sourceMappingURL=monitor.d.ts.map