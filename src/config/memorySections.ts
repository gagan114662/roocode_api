// src/config/memorySections.ts
export const memorySections = [
  'productContext',      // high-level goals & requirements
  'decisionLog',         // architectural & design decisions
  'implementationNotes', // code-level commentary
  'testCoverage',       // benchmark/TestGen results
  'ciIssues'            // CI/CD failures & fixes
] as const;

export type MemorySection = typeof memorySections[number];
