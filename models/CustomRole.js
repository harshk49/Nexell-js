const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CustomRoleSchema = new Schema(
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
    isSystemRole: {
      type: Boolean,
      default: false,
    },
    basedOn: {
      type: String,
      enum: ["admin", "manager", "member", "guest", "custom"],
      default: "custom",
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
      // Comment & collaboration permissions
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
    // Resource-specific overrides
    resourcePermissionOverrides: [
      {
        resourceType: {
          type: String,
          enum: ["project", "team", "task"],
          required: true,
        },
        resourceId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        permissions: {
          type: Object,
          default: {},
        },
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

// Create predefined system roles
CustomRoleSchema.statics.createDefaultRoles = async function (
  organizationId,
  createdBy
) {
  const roles = [
    {
      name: "Administrator",
      description: "Full access to all features",
      organization: organizationId,
      isSystemRole: true,
      basedOn: "admin",
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
        reports: {
          viewOwn: true,
          viewTeam: true,
          viewAll: true,
          export: true,
        },
        comments: {
          create: true,
          edit: true,
          delete: true,
          resolve: true,
        },
        integrations: {
          view: true,
          edit: true,
          calendar: true,
          invoice: true,
        },
        analytics: {
          viewPersonal: true,
          viewTeam: true,
          viewOrganization: true,
        },
        customFields: {
          view: true,
          edit: true,
        },
      },
      createdBy,
    },
    {
      name: "Manager",
      description: "Can manage projects and teams",
      organization: organizationId,
      isSystemRole: true,
      basedOn: "manager",
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
          create: true,
          view: true,
          edit: true,
          delete: false,
          manageMembers: true,
          manageTeams: true,
        },
        teams: {
          create: true,
          view: true,
          edit: true,
          delete: false,
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
          viewAll: false,
        },
        reports: {
          viewOwn: true,
          viewTeam: true,
          viewAll: false,
          export: true,
        },
        comments: {
          create: true,
          edit: true,
          delete: true,
          resolve: true,
        },
        integrations: {
          view: true,
          edit: false,
          calendar: true,
          invoice: true,
        },
        analytics: {
          viewPersonal: true,
          viewTeam: true,
          viewOrganization: false,
        },
        customFields: {
          view: true,
          edit: false,
        },
      },
      createdBy,
    },
    {
      name: "Member",
      description: "Standard team member",
      organization: organizationId,
      isSystemRole: true,
      basedOn: "member",
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
          viewTeam: false,
          viewAll: false,
        },
        reports: {
          viewOwn: true,
          viewTeam: false,
          viewAll: false,
          export: false,
        },
        comments: {
          create: true,
          edit: true,
          delete: false,
          resolve: true,
        },
        integrations: {
          view: true,
          edit: false,
          calendar: true,
          invoice: false,
        },
        analytics: {
          viewPersonal: true,
          viewTeam: false,
          viewOrganization: false,
        },
        customFields: {
          view: true,
          edit: false,
        },
      },
      createdBy,
    },
    {
      name: "Guest",
      description: "Limited access, view-only for most features",
      organization: organizationId,
      isSystemRole: true,
      basedOn: "guest",
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
        comments: {
          create: true,
          edit: false,
          delete: false,
          resolve: false,
        },
        integrations: {
          view: false,
          edit: false,
          calendar: false,
          invoice: false,
        },
        analytics: {
          viewPersonal: false,
          viewTeam: false,
          viewOrganization: false,
        },
        customFields: {
          view: true,
          edit: false,
        },
      },
      createdBy,
    },
  ];

  // Check if roles already exist
  for (const role of roles) {
    const existingRole = await this.findOne({
      name: role.name,
      organization: organizationId,
      isSystemRole: true,
    });

    if (!existingRole) {
      await this.create(role);
    }
  }
};

module.exports = mongoose.model("CustomRole", CustomRoleSchema);
