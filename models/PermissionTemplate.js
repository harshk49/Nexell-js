const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PermissionTemplateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    permissions: {
      // Organization permissions
      organization: {
        view: {
          type: Boolean,
          default: true,
        },
        edit: {
          type: Boolean,
          default: false,
        },
        delete: {
          type: Boolean,
          default: false,
        },
        manageMembers: {
          type: Boolean,
          default: false,
        },
        manageSettings: {
          type: Boolean,
          default: false,
        },
        manageRoles: {
          type: Boolean,
          default: false,
        },
        manageBilling: {
          type: Boolean,
          default: false,
        },
      },
      // Project permissions
      projects: {
        create: {
          type: Boolean,
          default: false,
        },
        view: {
          type: Boolean,
          default: true,
        },
        edit: {
          type: Boolean,
          default: false,
        },
        delete: {
          type: Boolean,
          default: false,
        },
        manageMembers: {
          type: Boolean,
          default: false,
        },
        manageTeams: {
          type: Boolean,
          default: false,
        },
      },
      // Team permissions
      teams: {
        create: {
          type: Boolean,
          default: false,
        },
        view: {
          type: Boolean,
          default: true,
        },
        edit: {
          type: Boolean,
          default: false,
        },
        delete: {
          type: Boolean,
          default: false,
        },
        manageMembers: {
          type: Boolean,
          default: false,
        },
      },
      // Task permissions
      tasks: {
        create: {
          type: Boolean,
          default: true,
        },
        view: {
          type: Boolean,
          default: true,
        },
        edit: {
          type: Boolean,
          default: true,
        },
        delete: {
          type: Boolean,
          default: false,
        },
        reassign: {
          type: Boolean,
          default: false,
        },
        timeTracking: {
          type: Boolean,
          default: true,
        },
      },
      // Time tracking permissions
      timeTracking: {
        track: {
          type: Boolean,
          default: true,
        },
        editOwn: {
          type: Boolean,
          default: true,
        },
        editOthers: {
          type: Boolean,
          default: false,
        },
        viewOwn: {
          type: Boolean,
          default: true,
        },
        viewTeam: {
          type: Boolean,
          default: false,
        },
        viewAll: {
          type: Boolean,
          default: false,
        },
      },
      // Report permissions
      reports: {
        viewOwn: {
          type: Boolean,
          default: true,
        },
        viewTeam: {
          type: Boolean,
          default: false,
        },
        viewAll: {
          type: Boolean,
          default: false,
        },
        export: {
          type: Boolean,
          default: false,
        },
      },
      // Comment permissions
      comments: {
        create: {
          type: Boolean,
          default: true,
        },
        edit: {
          type: Boolean,
          default: true,
        },
        delete: {
          type: Boolean,
          default: false,
        },
        resolve: {
          type: Boolean,
          default: true,
        },
      },
      // Integration permissions
      integrations: {
        view: {
          type: Boolean,
          default: true,
        },
        edit: {
          type: Boolean,
          default: false,
        },
        calendar: {
          type: Boolean,
          default: true,
        },
        invoice: {
          type: Boolean,
          default: false,
        },
      },
      // Analytics permissions
      analytics: {
        viewPersonal: {
          type: Boolean,
          default: true,
        },
        viewTeam: {
          type: Boolean,
          default: false,
        },
        viewOrganization: {
          type: Boolean,
          default: false,
        },
      },
      // Custom fields permissions
      customFields: {
        view: {
          type: Boolean,
          default: true,
        },
        edit: {
          type: Boolean,
          default: false,
        },
      },
    },
    applicableResourceTypes: [
      {
        type: String,
        enum: ["project", "team", "task", "note"],
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Create default permission templates for a new organization
 */
PermissionTemplateSchema.statics.createDefaultTemplates = async function (
  organizationId,
  userId
) {
  const templates = [
    {
      name: "Full Access",
      description: "Complete access to all resources",
      isDefault: true,
      applicableResourceTypes: ["project", "team", "task", "note"],
      permissions: {
        organization: {
          view: true,
          edit: true,
          delete: true,
          manageMembers: true,
          manageSettings: true,
          manageRoles: true,
          manageBilling: true,
        },
        projects: {
          create: true,
          view: true,
          edit: true,
          delete: true,
          manageMembers: true,
          manageTeams: true,
        },
        teams: {
          create: true,
          view: true,
          edit: true,
          delete: true,
          manageMembers: true,
        },
        tasks: {
          create: true,
          view: true,
          edit: true,
          delete: true,
          reassign: true,
          timeTracking: true,
        },
        timeTracking: {
          track: true,
          editOwn: true,
          editOthers: true,
          viewOwn: true,
          viewTeam: true,
          viewAll: true,
        },
        reports: { viewOwn: true, viewTeam: true, viewAll: true, export: true },
        comments: { create: true, edit: true, delete: true, resolve: true },
        integrations: { view: true, edit: true, calendar: true, invoice: true },
        analytics: {
          viewPersonal: true,
          viewTeam: true,
          viewOrganization: true,
        },
        customFields: { view: true, edit: true },
      },
    },
    {
      name: "Edit Access",
      description: "Can view and edit but not delete",
      isDefault: true,
      applicableResourceTypes: ["project", "team", "task", "note"],
      permissions: {
        organization: {
          view: true,
          edit: false,
          delete: false,
          manageMembers: false,
          manageSettings: false,
          manageRoles: false,
          manageBilling: false,
        },
        projects: {
          create: false,
          view: true,
          edit: true,
          delete: false,
          manageMembers: false,
          manageTeams: false,
        },
        teams: {
          create: false,
          view: true,
          edit: true,
          delete: false,
          manageMembers: false,
        },
        tasks: {
          create: true,
          view: true,
          edit: true,
          delete: false,
          reassign: false,
          timeTracking: true,
        },
        timeTracking: {
          track: true,
          editOwn: true,
          editOthers: false,
          viewOwn: true,
          viewTeam: true,
          viewAll: false,
        },
        reports: {
          viewOwn: true,
          viewTeam: true,
          viewAll: false,
          export: true,
        },
        comments: { create: true, edit: true, delete: false, resolve: true },
        integrations: {
          view: true,
          edit: false,
          calendar: true,
          invoice: false,
        },
        analytics: {
          viewPersonal: true,
          viewTeam: true,
          viewOrganization: false,
        },
        customFields: { view: true, edit: true },
      },
    },
    {
      name: "View Only",
      description: "Can only view resources",
      isDefault: true,
      applicableResourceTypes: ["project", "team", "task", "note"],
      permissions: {
        organization: {
          view: true,
          edit: false,
          delete: false,
          manageMembers: false,
          manageSettings: false,
          manageRoles: false,
          manageBilling: false,
        },
        projects: {
          create: false,
          view: true,
          edit: false,
          delete: false,
          manageMembers: false,
          manageTeams: false,
        },
        teams: {
          create: false,
          view: true,
          edit: false,
          delete: false,
          manageMembers: false,
        },
        tasks: {
          create: false,
          view: true,
          edit: false,
          delete: false,
          reassign: false,
          timeTracking: false,
        },
        timeTracking: {
          track: false,
          editOwn: false,
          editOthers: false,
          viewOwn: true,
          viewTeam: false,
          viewAll: false,
        },
        reports: {
          viewOwn: true,
          viewTeam: false,
          viewAll: false,
          export: false,
        },
        comments: { create: true, edit: false, delete: false, resolve: false },
        integrations: {
          view: false,
          edit: false,
          calendar: false,
          invoice: false,
        },
        analytics: {
          viewPersonal: true,
          viewTeam: false,
          viewOrganization: false,
        },
        customFields: { view: true, edit: false },
      },
    },
  ];

  for (const template of templates) {
    await this.create({
      ...template,
      organization: organizationId,
      createdBy: userId,
    });
  }
};

const PermissionTemplate = mongoose.model(
  "PermissionTemplate",
  PermissionTemplateSchema
);

module.exports = PermissionTemplate;
