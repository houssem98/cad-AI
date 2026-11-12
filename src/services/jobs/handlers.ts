// Production job types, each run by jobWorker in its own process; a job completes only when its result is verified.
// L6 T2 adds text-to-CAD and T3 STEP-to-CAD.
export const handlers: Record<string, (input: any) => Promise<{ verified: boolean; result?: unknown }>> = {};
