const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Task = require('../models/Task');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Task.deleteMany({});
  await User.deleteMany({});
});

describe('Task API', () => {
  let token;
  let userId;

  beforeEach(async () => {
    // Create a test user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    userId = user._id;

    // Generate token
    token = jwt.sign(
      { userId: user._id },
      config.app.jwtSecret,
      { expiresIn: config.app.jwtExpiresIn }
    );
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        priority: 'medium',
        dueDate: new Date(),
        category: 'Test Category',
        tags: ['test', 'task']
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body.task).toHaveProperty('_id');
      expect(response.body.task.title).toBe(taskData.title);
      expect(response.body.task.description).toBe(taskData.description);
      expect(response.body.task.owner).toBe(userId.toString());
    });

    it('should return 400 for invalid task data', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      // Create test tasks
      await Task.create([
        {
          title: 'Task 1',
          description: 'Description 1',
          status: 'pending',
          priority: 'medium',
          owner: userId,
          category: 'Test Category',
          tags: ['test']
        },
        {
          title: 'Task 2',
          description: 'Description 2',
          status: 'completed',
          priority: 'high',
          owner: userId,
          category: 'Test Category',
          tags: ['test']
        }
      ]);
    });

    it('should get all tasks for the user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=pending')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(1);
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(1);
    });

    it('should search tasks by title or description', async () => {
      const response = await request(app)
        .get('/api/tasks?search=Task 1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(1);
    });
  });

  describe('GET /api/tasks/:id', () => {
    let taskId;

    beforeEach(async () => {
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        priority: 'medium',
        owner: userId
      });
      taskId = task._id;
    });

    it('should get a task by id', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.task._id).toBe(taskId.toString());
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get(`/api/tasks/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let taskId;

    beforeEach(async () => {
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        priority: 'medium',
        owner: userId
      });
      taskId = task._id;
    });

    it('should update a task', async () => {
      const updateData = {
        title: 'Updated Task',
        description: 'Updated Description',
        status: 'completed'
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.task.title).toBe(updateData.title);
      expect(response.body.task.description).toBe(updateData.description);
      expect(response.body.task.status).toBe(updateData.status);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .put(`/api/tasks/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Task' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let taskId;

    beforeEach(async () => {
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        priority: 'medium',
        owner: userId
      });
      taskId = task._id;
    });

    it('should delete a task', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      
      // Verify task is deleted
      const deletedTask = await Task.findById(taskId);
      expect(deletedTask).toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/tasks/:id/comments', () => {
    let taskId;

    beforeEach(async () => {
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        priority: 'medium',
        owner: userId
      });
      taskId = task._id;
    });

    it('should add a comment to a task', async () => {
      const commentData = {
        content: 'Test Comment'
      };

      const response = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send(commentData);

      expect(response.status).toBe(200);
      expect(response.body.task.comments).toHaveLength(1);
      expect(response.body.task.comments[0].content).toBe(commentData.content);
      expect(response.body.task.comments[0].user._id).toBe(userId.toString());
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .post(`/api/tasks/${new mongoose.Types.ObjectId()}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Test Comment' });

      expect(response.status).toBe(404);
    });
  });
}); 