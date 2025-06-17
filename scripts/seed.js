#!/usr/bin/env node

/**
 * Nexell Database Seeder
 *
 * This script populates the database with sample data for development and testing.
 */

import "dotenv/config";
import mongoose from "mongoose";
import chalk from "chalk";
import User from "../models/User.js";
import Task from "../models/Task.js";
import Note from "../models/Note.js";
import Organization from "../models/Organization.js";
import Team from "../models/Team.js";
import Project from "../models/Project.js";
import { fileURLToPath } from "url";
import path from "path";

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to the database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(chalk.green(`MongoDB Connected: ${conn.connection.host}`));
  } catch (error) {
    console.error(chalk.red(`Error connecting to MongoDB: ${error.message}`));
    process.exit(1);
  }
};

// Disconnect from the database
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log(chalk.yellow("Disconnected from MongoDB"));
  } catch (error) {
    console.error(
      chalk.red(`Error disconnecting from MongoDB: ${error.message}`)
    );
  }
};

// Clear all existing data
const clearDatabase = async () => {
  if (process.env.NODE_ENV === "production") {
    console.error(chalk.red("Cannot run seeder in production environment!"));
    process.exit(1);
  }

  try {
    const collections = Object.keys(mongoose.connection.collections);

    for (const collectionName of collections) {
      const collection = mongoose.connection.collections[collectionName];
      await collection.deleteMany({});
    }

    console.log(chalk.yellow("All collections cleared successfully"));
  } catch (error) {
    console.error(chalk.red(`Error clearing database: ${error.message}`));
    process.exit(1);
  }
};

// Seed users
const seedUsers = async () => {
  try {
    const users = [
      {
        username: "johndoe",
        email: "john@example.com",
        password: "Password123!",
        firstName: "John",
        lastName: "Doe",
        isVerified: true,
        isActive: true,
      },
      {
        username: "janedoe",
        email: "jane@example.com",
        password: "Password123!",
        firstName: "Jane",
        lastName: "Doe",
        isVerified: true,
        isActive: true,
      },
      {
        username: "admin",
        email: "admin@nexell.app",
        password: "AdminPassword123!",
        firstName: "Admin",
        lastName: "User",
        isVerified: true,
        isActive: true,
      },
    ];

    const createdUsers = await User.create(users);
    console.log(chalk.green(`${createdUsers.length} users created`));
    return createdUsers;
  } catch (error) {
    console.error(chalk.red(`Error seeding users: ${error.message}`));
    throw error;
  }
};

// Seed organizations
const seedOrganizations = async (users) => {
  try {
    const organizations = [
      {
        name: "Nexell Inc.",
        description: "The parent organization for Nexell products",
        owner: users[0]._id,
        members: [users[0]._id, users[1]._id],
      },
      {
        name: "Test Organization",
        description: "An organization for testing purposes",
        owner: users[1]._id,
        members: [users[1]._id, users[2]._id],
      },
    ];

    const createdOrganizations = await Organization.create(organizations);
    console.log(
      chalk.green(`${createdOrganizations.length} organizations created`)
    );
    return createdOrganizations;
  } catch (error) {
    console.error(chalk.red(`Error seeding organizations: ${error.message}`));
    throw error;
  }
};

// Seed teams
const seedTeams = async (organizations, users) => {
  try {
    const teams = [
      {
        name: "Development",
        description: "Software development team",
        organization: organizations[0]._id,
        members: [users[0]._id, users[1]._id],
        createdBy: users[0]._id,
      },
      {
        name: "Design",
        description: "Product design team",
        organization: organizations[0]._id,
        members: [users[1]._id],
        createdBy: users[0]._id,
      },
      {
        name: "Testing",
        description: "Quality assurance team",
        organization: organizations[1]._id,
        members: [users[1]._id, users[2]._id],
        createdBy: users[1]._id,
      },
    ];

    const createdTeams = await Team.create(teams);
    console.log(chalk.green(`${createdTeams.length} teams created`));
    return createdTeams;
  } catch (error) {
    console.error(chalk.red(`Error seeding teams: ${error.message}`));
    throw error;
  }
};

// Seed projects
const seedProjects = async (organizations, teams, users) => {
  try {
    const projects = [
      {
        name: "Website Redesign",
        description: "Complete redesign of the company website",
        organization: organizations[0]._id,
        teams: [teams[0]._id, teams[1]._id],
        members: [users[0]._id, users[1]._id],
        createdBy: users[0]._id,
        status: "in-progress",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      {
        name: "Mobile App",
        description: "Develop a new mobile application",
        organization: organizations[0]._id,
        teams: [teams[0]._id],
        members: [users[0]._id],
        createdBy: users[0]._id,
        status: "planning",
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      },
      {
        name: "Quality Assurance",
        description: "Quality assurance for all products",
        organization: organizations[1]._id,
        teams: [teams[2]._id],
        members: [users[1]._id, users[2]._id],
        createdBy: users[1]._id,
        status: "active",
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      },
    ];

    const createdProjects = await Project.create(projects);
    console.log(chalk.green(`${createdProjects.length} projects created`));
    return createdProjects;
  } catch (error) {
    console.error(chalk.red(`Error seeding projects: ${error.message}`));
    throw error;
  }
};

// Seed tasks
const seedTasks = async (users, projects) => {
  try {
    // Generate random tasks
    const tasks = [];
    const statuses = ["todo", "in-progress", "review", "completed"];
    const priorities = ["low", "medium", "high", "urgent"];

    for (let i = 0; i < 50; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomProject =
        projects[Math.floor(Math.random() * projects.length)];
      const randomStatus =
        statuses[Math.floor(Math.random() * statuses.length)];
      const randomPriority =
        priorities[Math.floor(Math.random() * priorities.length)];

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30)); // Due within next 30 days

      tasks.push({
        title: `Task ${i + 1}`,
        description: `This is a sample task ${i + 1}`,
        owner: randomUser._id,
        project: randomProject._id,
        status: randomStatus,
        priority: randomPriority,
        dueDate,
        assignedTo: randomUser._id,
        tags: ["sample", "seed", `tag-${i % 5}`],
      });
    }

    const createdTasks = await Task.create(tasks);
    console.log(chalk.green(`${createdTasks.length} tasks created`));
    return createdTasks;
  } catch (error) {
    console.error(chalk.red(`Error seeding tasks: ${error.message}`));
    throw error;
  }
};

// Seed notes
const seedNotes = async (users, projects) => {
  try {
    const notes = [];

    for (let i = 0; i < 30; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomProject =
        i < 20 ? projects[Math.floor(Math.random() * projects.length)] : null;

      notes.push({
        title: `Note ${i + 1}`,
        content: `This is the content for sample note ${i + 1}. It contains some text that would be useful for testing.`,
        owner: randomUser._id,
        project: randomProject ? randomProject._id : undefined,
        isPinned: i % 10 === 0,
        tags: ["sample", "note", `category-${i % 5}`],
      });
    }

    const createdNotes = await Note.create(notes);
    console.log(chalk.green(`${createdNotes.length} notes created`));
    return createdNotes;
  } catch (error) {
    console.error(chalk.red(`Error seeding notes: ${error.message}`));
    throw error;
  }
};

// Main seeder function
const seedDatabase = async () => {
  try {
    console.log(chalk.blue("Starting database seeder..."));

    await connectDB();
    await clearDatabase();

    const users = await seedUsers();
    const organizations = await seedOrganizations(users);
    const teams = await seedTeams(organizations, users);
    const projects = await seedProjects(organizations, teams, users);
    await seedTasks(users, projects);
    await seedNotes(users, projects);

    console.log(
      chalk.green.bold("Database seeding completed successfully! 🎉")
    );

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error(chalk.red(`Database seeding failed: ${error.message}`));
    await disconnectDB();
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
