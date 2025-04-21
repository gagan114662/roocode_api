import { APIRequestContext } from '@playwright/test';
import { ProjectFixture } from '../fixtures/types';

export async function createProject(
  request: APIRequestContext, 
  projectId: string
): Promise<ProjectFixture> {
  await request.post(`/api/v1/projects`, {
    data: { id: projectId }
  });
  
  return {
    id: projectId,
    uploads: []
  };
}

export async function deleteProject(
  request: APIRequestContext,
  projectId: string
): Promise<void> {
  await request.delete(`/api/v1/projects/${projectId}`);
}
