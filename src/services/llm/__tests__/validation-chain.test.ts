import { FunctionHandler } from '../FunctionHandler';
import { OpenAIProvider } from '../../../api/openaiProvider';
import { telemetry } from '../../telemetry/TelemetryService';

describe('Validation Chain Integration', () => {
  let handler: FunctionHandler;
  let provider: OpenAIProvider;

  beforeEach(() => {
    // Initialize with mocked dependencies
    handler = new FunctionHandler({} as any, {} as any, {} as any);
    provider = new OpenAIProvider();

    jest.spyOn(telemetry, 'logValidation');
    jest.spyOn(console, 'warn');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logs validation attempts through the chain', async () => {
    // Mock LLM to return invalid then valid response
    const mockResponses = [
      { content: 'test' }, // Invalid
      { // Valid
        content: 'console.log("test")',
        language: 'typescript',
        metadata: {
          filename: 'test.ts',
          description: 'Test file'
        }
      }
    ];

    let responseIndex = 0;
    jest.spyOn(handler as any, 'callLLM')
      .mockImplementation(() => Promise.resolve(
        JSON.stringify(mockResponses[responseIndex++])
      ));

    // Execute code generation
    const result = await handler.generateCode({
      projectId: 'test',
      prompt: 'Generate test code'
    });

    // Verify telemetry
    expect(telemetry.logValidation).toHaveBeenCalledTimes(3); // 2 validations (1 fail, 1 success)
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Validation attempt 1/3 failed')
    );
    expect(result.content).toBe('console.log("test")');
  });

  it('reports stats on validation chain completion', async () => {
    const logSpy = jest.spyOn(console, 'info');

    // Generate some validation events
    await handler.generateCode({
      projectId: 'test',
      prompt: 'Generate test code'
    });

    await telemetry.flush();

    expect(logSpy).toHaveBeenCalledWith(
      '[Validation Stats]',
      expect.objectContaining({
        code: expect.any(Object)
      })
    );
  });
});
