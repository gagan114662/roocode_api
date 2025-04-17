import { Router, Response, NextFunction } from 'express';
import { RequestHandler } from 'express-serve-static-core';
import { AuthenticatedRequest, authorize } from '../middleware/auth';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

interface PlannerRequest {
    requirements: string;
    context?: string;
    projectType?: string;
}

interface Component {
    name: string;
    description: string;
    dependencies: string[];
    priority: number;
    estimatedComplexity: 'low' | 'medium' | 'high';
    tasks: {
        description: string;
        type: 'implementation' | 'testing' | 'documentation';
    }[];
}

interface Plan {
    components: Component[];
    implementationOrder: string[];
    projectStructure: {
        directories: string[];
        files: {
            path: string;
            description: string;
        }[];
    };
}

interface TypedRequestWithBody<T> extends AuthenticatedRequest {
    body: T;
}

// Generate project plan from requirements
const generatePlan: RequestHandler = async (
    req: TypedRequestWithBody<PlannerRequest>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { requirements, context, projectType } = req.body;

        if (!requirements) {
            res.status(400).json({
                status: 'error',
                message: 'Requirements are required'
            });
            return;
        }

        // Use Ollama to generate a project plan
        try {
            const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
            const ollamaModel = process.env.OLLAMA_MODEL || 'llama3:latest';

            const prompt = `
You are an expert software architect and project planner. Break down the following project requirements into manageable components.

Requirements:
${requirements}

${context ? `Additional Context:\n${context}\n` : ''}
${projectType ? `Project Type: ${projectType}\n` : ''}

Provide a detailed project plan in JSON format with the following structure:
{
  "components": [
    {
      "name": "ComponentName",
      "description": "Detailed description of the component",
      "dependencies": ["DependencyComponent1", "DependencyComponent2"],
      "priority": 1-10 (1 being highest priority),
      "estimatedComplexity": "low|medium|high",
      "tasks": [
        {
          "description": "Task description",
          "type": "implementation|testing|documentation"
        }
      ]
    }
  ],
  "implementationOrder": ["Component1", "Component2", "Component3"],
  "projectStructure": {
    "directories": ["dir1/", "dir2/subdir/"],
    "files": [
      {
        "path": "path/to/file.ext",
        "description": "Purpose of this file"
      }
    ]
  }
}

Ensure the implementation order respects component dependencies.
`;

            const response = await axios.post(
                `${ollamaUrl}/api/generate`,
                {
                    model: ollamaModel,
                    prompt,
                    stream: false
                }
            );

            // Extract JSON from the response
            const responseText = response.data.response;
            const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                              responseText.match(/```\n([\s\S]*?)\n```/) || 
                              responseText.match(/{[\s\S]*}/);
            
            let plan: Plan;
            
            if (jsonMatch) {
                const jsonStr = jsonMatch[1] || jsonMatch[0];
                plan = JSON.parse(jsonStr);
            } else {
                throw new Error('Could not extract valid JSON from the response');
            }

            // Save the plan to a file
            const planDir = path.join(process.cwd(), 'plans');
            if (!fs.existsSync(planDir)) {
                fs.mkdirSync(planDir, { recursive: true });
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const planPath = path.join(planDir, `plan-${timestamp}.json`);
            fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));

            res.json({
                status: 'success',
                data: {
                    plan,
                    planPath,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Planner error:', error);
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

// Get all saved plans
const getPlans: RequestHandler = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const planDir = path.join(process.cwd(), 'plans');
        if (!fs.existsSync(planDir)) {
            fs.mkdirSync(planDir, { recursive: true });
        }
        
        const plans = fs.readdirSync(planDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(planDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                return {
                    name: file,
                    path: filePath,
                    plan: JSON.parse(content)
                };
            });
        
        res.json({
            status: 'success',
            data: {
                plans,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};

// Register routes with middleware
router.post('/generate', authorize(['write']), generatePlan);
router.get('/list', authorize(['read']), getPlans);

export const plannerRouter = router;