import { TelemetryService } from '../TelemetryService';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new TelemetryService();
    consoleSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs validation events', () => {
    service.logValidation({
      schema: 'test',
      success: true,
      attempts: 1
    });

    service.logValidation({
      schema: 'test',
      success: false,
      error: 'Invalid data',
      attempts: 2
    });

    service.flush();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Validation Stats]',
      expect.objectContaining({
        test: {
          total: 2,
          failures: 1,
          avgAttempts: 1.5
        }
      })
    );
  });
});
