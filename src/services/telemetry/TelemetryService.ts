interface ValidationEvent {
  schema: string;
  success: boolean;
  error?: string;
  attempts: number;
  timestamp: number;
}

export class TelemetryService {
  private validationEvents: ValidationEvent[] = [];

  logValidation(event: Omit<ValidationEvent, 'timestamp'>) {
    this.validationEvents.push({
      ...event,
      timestamp: Date.now()
    });

    // Log validation failures for monitoring
    if (!event.success) {
      console.warn(
        `[Validation Failed] Schema: ${event.schema}, ` +
        `Attempt: ${event.attempts}, Error: ${event.error}`
      );
    }
  }

  async flush() {
    if (this.validationEvents.length === 0) return;

    // Group events by schema
    const stats = this.validationEvents.reduce((acc, event) => {
      const key = event.schema;
      if (!acc[key]) {
        acc[key] = { total: 0, failures: 0, avgAttempts: 0 };
      }
      acc[key].total++;
      if (!event.success) acc[key].failures++;
      acc[key].avgAttempts += event.attempts;
      return acc;
    }, {} as Record<string, { total: number; failures: number; avgAttempts: number }>);

    // Calculate averages
    Object.values(stats).forEach(stat => {
      stat.avgAttempts = stat.avgAttempts / stat.total;
    });

    // Log stats
    console.info('[Validation Stats]', stats);

    // Clear events after processing
    this.validationEvents = [];
  }
}

// Singleton instance
export const telemetry = new TelemetryService();
