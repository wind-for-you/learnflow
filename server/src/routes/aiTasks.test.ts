import express from 'express';
import request from 'supertest';
import aiTaskRoutes from './aiTasks';

describe('AI Tasks Routes - Route Ordering', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/ai-tasks', aiTaskRoutes);
  });

  it('should distinguish batch endpoint from single task endpoint', async () => {
    const batchResponse = await request(app)
      .put('/ai-tasks/plan-123/batch')
      .send({ completions: { 'task-1': true, 'task-2': false } });
    
    expect(batchResponse.status).not.toBe(404);
    
    const singleResponse = await request(app)
      .put('/ai-tasks/plan-123/task-key-1')
      .send({ completed: true });
    
    expect(singleResponse.status).not.toBe(404);
  });

  it('batch route should match /planId/batch exactly', async () => {
    const response = await request(app)
      .put('/ai-tasks/plan-456/batch')
      .send({ completions: {} });
    
    expect(response.status).not.toBe(404);
  });

  it('single task route should match /planId/:taskKey pattern', async () => {
    const response = await request(app)
      .put('/ai-tasks/plan-789/some-task-key')
      .send({ completed: true });
    
    expect(response.status).not.toBe(404);
  });
});
