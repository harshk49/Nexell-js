import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";

import Task from "../models/Task.js";
import User from "../models/User.js";
import app from "../server.js";

describe("Task API Tests", () => {
  let mongoServer;
  let testUser;
  let authToken;

  // Setup before all tests
  beforeAll(async () => {
    // Create in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Connect to the in-memory database
    await mongoose.connect(uri);

    // Create test user
    testUser = new User({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
      isVerified: true,
    });

    await testUser.save();

    // Generate auth token for the test user
    authToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  // Cleanup after all tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clean the database between tests
  afterEach(async () => {
    await Task.deleteMany({});
  });

  // Test creating a task
  describe("POST /api/tasks", () => {
    it("should create a new task when authenticated", async () => {
      const taskData = {
        title: "Test Task",
        description: "This is a test task",
        status: "todo",
        priority: "medium",
        dueDate: new Date().toISOString(),
        tags: ["test", "example"],
      };

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.task).toHaveProperty("_id");
      expect(response.body.task.title).toBe(taskData.title);
      expect(response.body.task.owner.toString()).toBe(testUser._id.toString());
    });

    it("should return 401 when not authenticated", async () => {
      const taskData = {
        title: "Test Task",
        description: "This is a test task",
      };

      const response = await request(app).post("/api/tasks").send(taskData);

      expect(response.status).toBe(401);
    });

    it("should return 400 when title is missing", async () => {
      const taskData = {
        description: "This is a test task without a title",
      };

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send(taskData);

      expect(response.status).toBe(400);
    });
  });

  // Test getting tasks
  describe("GET /api/tasks", () => {
    beforeEach(async () => {
      // Create test tasks
      await Task.create([
        {
          title: "Task 1",
          description: "Description 1",
          status: "todo",
          priority: "high",
          owner: testUser._id,
        },
        {
          title: "Task 2",
          description: "Description 2",
          status: "in-progress",
          priority: "medium",
          owner: testUser._id,
        },
        {
          title: "Task 3",
          description: "Description 3",
          status: "completed",
          priority: "low",
          owner: testUser._id,
        },
      ]);
    });

    it("should retrieve all tasks for authenticated user", async () => {
      const response = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tasks).toBeInstanceOf(Array);
      expect(response.body.tasks.length).toBe(3);
      expect(response.body.pagination.total).toBe(3);
    });

    it("should filter tasks by status", async () => {
      const response = await request(app)
        .get("/api/tasks?status=completed")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toBeInstanceOf(Array);
      expect(response.body.tasks.length).toBe(1);
      expect(response.body.tasks[0].status).toBe("completed");
    });

    it("should sort tasks by priority", async () => {
      const response = await request(app)
        .get("/api/tasks?sortBy=priority&sortOrder=asc")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toBeInstanceOf(Array);
      expect(response.body.tasks.length).toBe(3);
      expect(response.body.tasks[0].priority).toBe("low");
    });

    it("should paginate tasks", async () => {
      const response = await request(app)
        .get("/api/tasks?page=1&limit=2")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toBeInstanceOf(Array);
      expect(response.body.tasks.length).toBe(2);
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.pagination.pages).toBe(2);
    });
  });

  // Test getting a single task
  describe("GET /api/tasks/:id", () => {
    let testTask;

    beforeEach(async () => {
      // Create a test task
      testTask = await Task.create({
        title: "Single Test Task",
        description: "This is a test task for single fetch",
        status: "todo",
        priority: "high",
        owner: testUser._id,
      });
    });

    it("should retrieve a task by id", async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTask._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.task._id.toString()).toBe(testTask._id.toString());
      expect(response.body.task.title).toBe("Single Test Task");
    });

    it("should return 404 for non-existent task", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  // Test updating a task
  describe("PUT /api/tasks/:id", () => {
    let testTask;

    beforeEach(async () => {
      // Create a test task
      testTask = await Task.create({
        title: "Task to Update",
        description: "This task will be updated",
        status: "todo",
        priority: "medium",
        owner: testUser._id,
      });
    });

    it("should update a task by id", async () => {
      const updatedData = {
        title: "Updated Task Title",
        status: "in-progress",
        priority: "high",
      };

      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.task.title).toBe(updatedData.title);
      expect(response.body.task.status).toBe(updatedData.status);
      expect(response.body.task.priority).toBe(updatedData.priority);

      // Original fields should be preserved
      expect(response.body.task.description).toBe("This task will be updated");
    });

    it("should return 404 when updating non-existent task", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/tasks/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(404);
    });
  });

  // Test deleting a task
  describe("DELETE /api/tasks/:id", () => {
    let testTask;

    beforeEach(async () => {
      // Create a test task
      testTask = await Task.create({
        title: "Task to Delete",
        description: "This task will be deleted",
        status: "todo",
        owner: testUser._id,
      });
    });

    it("should delete a task by id", async () => {
      const response = await request(app)
        .delete(`/api/tasks/${testTask._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify task is deleted
      const checkTask = await Task.findById(testTask._id);
      expect(checkTask).toBeNull();
    });

    it("should return 404 when deleting non-existent task", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/tasks/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
