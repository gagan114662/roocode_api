import { Request } from './express';

export interface RequestTiming {
  startTime: number;
  endTime: number;
  duration: number;
}

export interface TimingContext {
  requestId: string;
  startTime: number;
  timing?: RequestTiming;
}

export function hasTimingData(req: Request): boolean {
  return typeof req.startTime === 'number';
}

export function getRequestTiming(req: Request): RequestTiming {
  if (!hasTimingData(req)) {
    throw new Error('Request timing data not available');
  }

  const endTime = Date.now();
  return {
    startTime: req.startTime,
    endTime,
    duration: endTime - req.startTime
  };
}

export function safeGetTiming(req: Request): RequestTiming | undefined {
  try {
    return hasTimingData(req) ? getRequestTiming(req) : undefined;
  } catch {
    return undefined;
  }
}

export function withTiming<T extends Request>(
  handler: (req: T, timing: RequestTiming) => void
): (req: T) => void {
  return (req: T) => {
    const timing = safeGetTiming(req);
    if (timing) {
      handler(req, timing);
    }
  };
}