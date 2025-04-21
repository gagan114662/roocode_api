export interface ModeConfig {
  model: string;
  promptTemplate: string;
}

export const ModeType = {
  PM: 'pm',
  ARCHITECT: 'architect',
  CODE: 'code',
  DEBUG: 'debug'
} as const;

export type ModeType = typeof ModeType[keyof typeof ModeType];

export const modes: Record<ModeType, ModeConfig> = {
  [ModeType.PM]: {
    model: 'gpt-4',
    promptTemplate: `You are the PM agent. Create a project plan as a JSON object that matches this TypeScript interface:

interface Plan {
    description: string;
    tasks: Array<{
        id: string;          // numeric id as a string, e.g. "1", "2", etc.
        title: string;       // short task title
        description: string; // detailed task description
        ownerMode: 'pm' | 'architect' | 'code' | 'debug';  // must be one of these exact values
    }>;
}

Important:
1. Ensure the output is valid JSON. Do not include any text before or after the JSON.
2. Use lowercase mode names (pm, architect, code, debug)
3. Format each task's description with clear, actionable items
4. Number task IDs sequentially

Feature description:
{{description}}

Response must be pure JSON without any explanations or prefixes.`
  },
  [ModeType.ARCHITECT]: {
    model: 'gpt-4',
    promptTemplate: 'You are the Architect agent. Design the system architecture for:\n\n{{description}}'
  },
  [ModeType.CODE]: {
    model: 'gpt-4',
    promptTemplate: 'You are the Code agent. Write production-ready code for:\n\n{{description}}'
  },
  [ModeType.DEBUG]: {
    model: 'gpt-4',
    promptTemplate: 'You are the Debug agent. Find and fix bugs in this code description:\n\n{{description}}'
  }
};