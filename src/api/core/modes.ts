interface Mode {
    slug: string;
    name: string;
    description?: string;
    capabilities: string[];
}

class ModesManager {
    private currentMode: Mode | null = null;
    private availableModes: Mode[] = [
        {
            slug: 'code',
            name: 'Code',
            description: 'Software engineering mode for coding tasks',
            capabilities: ['write', 'read', 'execute']
        },
        {
            slug: 'architect',
            name: 'Architect',
            description: 'Technical planning and architecture mode',
            capabilities: ['read', 'plan']
        },
        {
            slug: 'ask',
            name: 'Ask',
            description: 'Question answering and information mode',
            capabilities: ['read']
        },
        {
            slug: 'debug',
            name: 'Debug',
            description: 'Debugging and problem diagnosis mode',
            capabilities: ['read', 'debug']
        }
    ];

    constructor() {
        this.currentMode = this.availableModes[0]; // Default to code mode
    }

    public list(): Mode[] {
        return this.availableModes;
    }

    public current(): Mode {
        if (!this.currentMode) {
            throw new Error('No mode currently set');
        }
        return this.currentMode;
    }

    public async switch(modeSlug: string, reason?: string): Promise<Mode> {
        const mode = this.availableModes.find(m => m.slug === modeSlug);
        if (!mode) {
            throw new Error(`Invalid mode: ${modeSlug}`);
        }

        this.currentMode = mode;
        return mode;
    }
}

export const modes = new ModesManager();