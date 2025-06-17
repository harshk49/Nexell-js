// Initialize MongoDB replica set
db.auth(
  process.env.MONGO_INITDB_ROOT_USERNAME,
  process.env.MONGO_INITDB_ROOT_PASSWORD
);

// Check if replica set is already initialized
const status = rs.status();

if (status.ok === 0 && status.code === 94) {
  // Not initialized, initialize the replica set
  rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "localhost:27017" }],
  });

  // Wait for the replica set to initialize
  let rsStatus;
  while (true) {
    rsStatus = rs.status();
    if (rsStatus.ok === 1) {
      break;
    }
    sleep(1000);
  }

  print("Replica set initialized successfully");
} else {
  print("Replica set already initialized");
}

// Create application database and user if they don't exist
const appDb = db.getSiblingDB("tasks-notes-app");

// Check if app user already exists
const appUser = appDb.getUser("app_user");
if (!appUser) {
  appDb.createUser({
    user: "app_user",
    pwd: process.env.MONGO_PASSWORD,
    roles: [{ role: "readWrite", db: "tasks-notes-app" }],
  });
  print("Application user created");
} else {
  print("Application user already exists");
}

// Create collections with validation
appDb.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "email", "firstName"],
      properties: {
        username: {
          bsonType: "string",
          description: "must be a string and is required",
        },
        email: {
          bsonType: "string",
          description: "must be a string and is required",
        },
        firstName: {
          bsonType: "string",
          description: "must be a string and is required",
        },
      },
    },
  },
});

appDb.createCollection("tasks", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "owner"],
      properties: {
        title: {
          bsonType: "string",
          description: "must be a string and is required",
        },
        owner: {
          bsonType: "objectId",
          description: "must be an objectId and is required",
        },
      },
    },
  },
});

appDb.createCollection("notes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "owner"],
      properties: {
        title: {
          bsonType: "string",
          description: "must be a string and is required",
        },
        owner: {
          bsonType: "objectId",
          description: "must be an objectId and is required",
        },
      },
    },
  },
});

// Create indexes
appDb.users.createIndex({ username: 1 }, { unique: true });
appDb.users.createIndex({ email: 1 }, { unique: true });
appDb.users.createIndex({ googleId: 1 }, { sparse: true });
appDb.users.createIndex({ githubId: 1 }, { sparse: true });

appDb.tasks.createIndex({ owner: 1 });
appDb.tasks.createIndex({ assignedTo: 1 });
appDb.tasks.createIndex({ project: 1 });
appDb.tasks.createIndex({ status: 1 });
appDb.tasks.createIndex({ dueDate: 1 });
appDb.tasks.createIndex({ tags: 1 });
appDb.tasks.createIndex({ title: "text", description: "text" });

appDb.notes.createIndex({ owner: 1 });
appDb.notes.createIndex({ tags: 1 });
appDb.notes.createIndex({ title: "text", content: "text" });

print("Database setup complete");
