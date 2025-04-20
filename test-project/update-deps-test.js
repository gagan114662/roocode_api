const { createDependencyUpdateService } = require('../src/services/DependencyUpdateService');
const { ProjectService } = require('../src/services/project.service');

async function testDependencyUpdate() {
    try {
        // Initialize project service and set test workspace path
        const projectService = new ProjectService();
        const workspacePath = __dirname;
        const dependencyService = createDependencyUpdateService(projectService, workspacePath);

        console.log('Starting dependency update test...');
        
        // Initialize git repo for test project
        await projectService.initializeProject('test-project');

        // Read original package.json
        const originalContent = await projectService.readFile('test-project', 'package.json');
        console.log('Original package.json:', originalContent);

        // Run dependency update
        const result = await dependencyService.updateDependencies('test-project');
        console.log('Update result:', result);

        // Read updated package.json
        const updatedContent = await projectService.readFile('test-project', 'package.json');
        console.log('Updated package.json:', updatedContent);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testDependencyUpdate();