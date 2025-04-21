import { EventEmitter } from 'events';

export const createTestVSCodeEnv = () => {
    const mockDisposable = { dispose: jest.fn() };
    const mockEventEmitter = {
        event: jest.fn(),
        fire: jest.fn(),
    };

    return {
        window: {
            createTerminal: jest.fn(),
            showErrorMessage: jest.fn(),
            showInformationMessage: jest.fn(),
            createOutputChannel: jest.fn(() => ({
                appendLine: jest.fn(),
                show: jest.fn(),
                dispose: jest.fn(),
            })),
            activeTextEditor: {
                document: {
                    uri: { fsPath: '/test/file.ts' },
                    getText: jest.fn(),
                    lineAt: jest.fn(),
                },
                selection: { start: { line: 0 }, end: { line: 0 } },
            },
        },
        workspace: {
            getConfiguration: jest.fn(() => ({
                get: jest.fn(),
                update: jest.fn(),
            })),
            workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
            onDidChangeConfiguration: jest.fn(),
        },
        Uri: {
            file: (path: string) => ({ fsPath: path }),
            parse: (uri: string) => ({ fsPath: uri }),
        },
        EventEmitter,
        Disposable: { from: (...items: any[]) => mockDisposable },
        Range: class {
            constructor(
                public start: { line: number; character: number },
                public end: { line: number; character: number }
            ) {}
        },
        Position: class {
            constructor(public line: number, public character: number) {}
        },
        env: {
            language: 'en',
        },
    };
};