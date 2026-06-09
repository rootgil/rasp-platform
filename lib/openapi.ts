/**
 * OpenAPI 3.0 specification for the RASP platform API.
 *
 * Auth: all routes require a valid NextAuth session cookie (set by POST /api/auth/signin).
 * Admin routes additionally require role="admin".
 * Backoffice routes require role="admin".
 *
 * Returned document is consumed by GET /api/openapi and rendered by /docs.
 */

const errorSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

const idParam = (description: string) => ({
  name: "id",
  in: "path" as const,
  required: true,
  description,
  schema: { type: "string" },
});

const sessionSecurity = [{ sessionCookie: [] }];

export function buildOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "RASP Platform API",
      version: "0.1.0",
      description:
        "Management API for the RASP (Runtime Application Self-Protection) platform. " +
        "All routes require an active NextAuth session (obtained via `POST /api/auth/signin`). " +
        "Admin and backoffice routes additionally require `role=admin`.",
    },
    servers: [{ url: "/api", description: "RASP Platform" }],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "next-auth.session-token",
          description:
            "NextAuth session cookie. Obtain by calling POST /api/auth/signin with credentials.",
        },
      },
      schemas: {
        Error: errorSchema,
      },
    },
    tags: [
      { name: "auth", description: "Authentication" },
      { name: "account", description: "User account management" },
      { name: "projects", description: "Project CRUD and lifecycle" },
      { name: "agents", description: "Agent inventory and runtime control" },
      { name: "api-keys", description: "API key management" },
      { name: "policies", description: "Security policy publishing and rollback" },
      { name: "alerts", description: "Security alert management" },
      { name: "events", description: "Security event log" },
      { name: "rules", description: "Detection rule management" },
      { name: "redaction-policies", description: "Data redaction policy management" },
      { name: "api-discovery", description: "Discovered API endpoint inventory" },
      { name: "audit-logs", description: "Tamper-evident audit log" },
      { name: "admin", description: "Admin operations (role=admin required)" },
      { name: "backoffice", description: "Internal backoffice operations (role=admin required)" },
      { name: "health", description: "Service health" },
    ],
    paths: {
      // ------------------------------------------------------------------ health
      "/health": {
        get: {
          tags: ["health"],
          summary: "Health check",
          operationId: "getHealth",
          security: [],
          responses: {
            200: {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ------------------------------------------------------------------ auth
      "/auth/signin": {
        post: {
          tags: ["auth"],
          summary: "Sign in with credentials",
          description:
            "NextAuth credentials sign-in. Returns a `Set-Cookie` header with the session token on success.",
          operationId: "signIn",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                    csrfToken: { type: "string" },
                    callbackUrl: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Signed in successfully" },
            401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/auth/force-signout": {
        post: {
          tags: ["auth"],
          summary: "Force sign-out current session",
          operationId: "forceSignout",
          security: sessionSecurity,
          responses: {
            200: { description: "Session invalidated" },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ account
      "/account/change-password": {
        post: {
          tags: ["account"],
          summary: "Change current user password",
          operationId: "changePassword",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["currentPassword", "newPassword"],
                  properties: {
                    currentPassword: { type: "string" },
                    newPassword: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Password changed",
              content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } },
            },
            400: { description: "Invalid input or wrong current password", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/account/onboarding": {
        post: {
          tags: ["account"],
          summary: "Mark current user onboarding as complete",
          operationId: "completeOnboarding",
          security: sessionSecurity,
          responses: {
            200: { description: "Onboarding completed" },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ projects
      "/projects": {
        get: {
          tags: ["projects"],
          summary: "List projects",
          operationId: "listProjects",
          security: sessionSecurity,
          responses: {
            200: { description: "Array of projects", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          tags: ["projects"],
          summary: "Create a project",
          operationId: "createProject",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "language"],
                  properties: {
                    name: { type: "string", minLength: 1, maxLength: 100 },
                    language: { type: "string", minLength: 1, description: "e.g. node, python, java" },
                    framework: { type: "string", description: "e.g. express, django, spring" },
                    environment: { type: "string", description: "e.g. production, staging" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Project created", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/projects/{id}": {
        parameters: [idParam("Project ID")],
        get: {
          tags: ["projects"],
          summary: "Get a project",
          operationId: "getProject",
          security: sessionSecurity,
          responses: {
            200: { description: "Project object", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        delete: {
          tags: ["projects"],
          summary: "Delete a project",
          operationId: "deleteProject",
          security: sessionSecurity,
          responses: {
            204: { description: "Deleted" },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/projects/{id}/rotate-key": {
        parameters: [idParam("Project ID")],
        post: {
          tags: ["projects"],
          summary: "Rotate tenant data-encryption key",
          description: "Rotates the tenant's DEK (Addendum E.6). Existing ciphertext remains readable under the previous key version; new payloads use the new key.",
          operationId: "rotateProjectKey",
          security: sessionSecurity,
          responses: {
            200: {
              description: "Key rotated",
              content: { "application/json": { schema: { type: "object", properties: { rotated: { type: "boolean" }, version: { type: "integer" } } } } },
            },
            400: { description: "Encryption not configured", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/projects/{id}/purge": {
        parameters: [idParam("Project ID")],
        post: {
          tags: ["projects"],
          summary: "Purge project telemetry data",
          description: "Right-to-deletion (`mode=delete-all`) or retention purge (`mode=retention`). When `cryptoShred=true` the tenant encryption keys are also destroyed.",
          operationId: "purgeProject",
          security: sessionSecurity,
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mode: { type: "string", enum: ["delete-all", "retention"], default: "delete-all" },
                    retentionDays: { type: "integer", minimum: 1, maximum: 3650, description: "Used when mode=retention" },
                    cryptoShred: { type: "boolean", description: "Also destroy encryption keys (delete-all only)" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Purge result", content: { "application/json": { schema: { type: "object", properties: { purged: { type: "object" }, keysDestroyed: { type: "integer" } } } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ agents
      "/agents": {
        get: {
          tags: ["agents"],
          summary: "List agents",
          operationId: "listAgents",
          security: sessionSecurity,
          responses: {
            200: { description: "Array of agents", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          tags: ["agents"],
          summary: "Create an agent",
          description: "Creates an agent and its initial API key. The raw key is returned only once.",
          operationId: "createAgent",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["projectId", "language"],
                  properties: {
                    projectId: { type: "string" },
                    language: { type: "string" },
                    framework: { type: "string" },
                    mode: { type: "string", enum: ["monitor", "block"], default: "monitor" },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Agent created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      agent: { type: "object", additionalProperties: true },
                      rawKey: { type: "string", nullable: true, description: "API key shown only once" },
                    },
                  },
                },
              },
            },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/agents/{id}": {
        parameters: [idParam("Agent ID")],
        get: {
          tags: ["agents"],
          summary: "Get an agent",
          operationId: "getAgent",
          security: sessionSecurity,
          responses: {
            200: { description: "Agent object", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/agents/{id}/mode": {
        parameters: [idParam("Agent ID")],
        post: {
          tags: ["agents"],
          summary: "Change agent enforcement mode",
          description: "Publishes a new signed policy that changes the enforcement mode to `monitor` or `block` for all agents on the same project+channel.",
          operationId: "setAgentMode",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["mode"],
                  properties: {
                    mode: { type: "string", enum: ["monitor", "block"] },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Mode updated",
              content: { "application/json": { schema: { type: "object", properties: { mode: { type: "string" }, policyVersion: { type: "integer" } } } } },
            },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Agent not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/agents/{id}/kill-switch": {
        parameters: [idParam("Agent ID")],
        post: {
          tags: ["agents"],
          summary: "Toggle agent kill-switch",
          description: "Enables or disables the kill-switch for a specific agent. When enabled the agent will disable itself on the next heartbeat.",
          operationId: "setAgentKillSwitch",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["killSwitch"],
                  properties: {
                    killSwitch: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Agent updated", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Agent not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/agents/{id}/version": {
        parameters: [idParam("Agent ID")],
        post: {
          tags: ["agents"],
          summary: "Set agent version controls",
          description: "Pin the agent to a specific version and/or configure a maintenance window for auto-updates (Addendum D.2).",
          operationId: "setAgentVersionControls",
          security: sessionSecurity,
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    pinnedVersion: { type: "string", nullable: true },
                    maintenanceWindow: {
                      type: "object",
                      nullable: true,
                      properties: {
                        startHour: { type: "integer", minimum: 0, maximum: 23 },
                        endHour: { type: "integer", minimum: 0, maximum: 24 },
                        days: { type: "array", items: { type: "integer", minimum: 0, maximum: 6 }, description: "0=Sunday ... 6=Saturday" },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Version controls updated",
              content: { "application/json": { schema: { type: "object", properties: { id: { type: "string" }, pinnedVersion: { type: "string", nullable: true }, maintenanceWindow: { type: "object", nullable: true } } } } },
            },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Agent not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ api-keys
      "/api-keys": {
        get: {
          tags: ["api-keys"],
          summary: "List API keys",
          operationId: "listApiKeys",
          security: sessionSecurity,
          responses: {
            200: { description: "Array of API keys (raw key hashes redacted)", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          tags: ["api-keys"],
          summary: "Create an API key",
          description: "Creates an API key for a project. The raw key is returned only once.",
          operationId: "createApiKey",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["projectId"],
                  properties: {
                    projectId: { type: "string" },
                    name: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Key created (rawKey shown only once)",
              content: { "application/json": { schema: { type: "object", properties: { id: { type: "string" }, prefix: { type: "string" }, rawKey: { type: "string" } } } } },
            },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api-keys/{id}/revoke": {
        parameters: [idParam("API Key ID")],
        post: {
          tags: ["api-keys"],
          summary: "Revoke an API key",
          operationId: "revokeApiKey",
          security: sessionSecurity,
          responses: {
            200: { description: "Key revoked", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Key not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ policies
      "/policies": {
        get: {
          tags: ["policies"],
          summary: "List policies",
          operationId: "listPolicies",
          security: sessionSecurity,
          parameters: [{ name: "projectId", in: "query", schema: { type: "string" }, description: "Filter by project" }],
          responses: {
            200: { description: "Array of policies", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          tags: ["policies"],
          summary: "Publish a policy",
          description: "Signs and publishes a new policy version. The policy is signed with Ed25519 so agents can verify it.",
          operationId: "createPolicy",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["projectId"],
                  properties: {
                    projectId: { type: "string" },
                    channel: { type: "string", enum: ["stable", "early", "edge"] },
                    mode: { type: "string", enum: ["monitor", "block"] },
                    detectionRules: { description: "Detection rules configuration" },
                    redactionConfig: { description: "Redaction configuration" },
                    dataResidency: { description: "Data residency configuration" },
                    targetAgentVersion: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Policy published", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/policies/{id}": {
        parameters: [idParam("Policy ID")],
        get: {
          tags: ["policies"],
          summary: "Get a policy version",
          operationId: "getPolicy",
          security: sessionSecurity,
          responses: {
            200: { description: "Policy object", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/policies/rollback": {
        post: {
          tags: ["policies"],
          summary: "Rollback to a previous policy version",
          description: "Re-publishes a previous policy version as a new signed version. Agents downgrade on the next heartbeat (<60s).",
          operationId: "rollbackPolicy",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["projectId", "targetVersion"],
                  properties: {
                    projectId: { type: "string" },
                    targetVersion: { type: "integer", minimum: 1, description: "Version number to roll back to" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Policy rolled back", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Target version not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ alerts
      "/alerts": {
        get: {
          tags: ["alerts"],
          summary: "List alerts",
          operationId: "listAlerts",
          security: sessionSecurity,
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: ["open", "investigating", "resolved"] } },
            { name: "severity", in: "query", schema: { type: "string", enum: ["critical", "high", "medium", "low"] } },
          ],
          responses: {
            200: { description: "Array of alerts", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/alerts/{id}": {
        parameters: [idParam("Alert ID")],
        patch: {
          tags: ["alerts"],
          summary: "Update an alert",
          operationId: "updateAlert",
          security: sessionSecurity,
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["open", "investigating", "resolved"] },
                    assignedTo: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Alert updated", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Alert not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ events
      "/events": {
        get: {
          tags: ["events"],
          summary: "List security events",
          operationId: "listEvents",
          security: sessionSecurity,
          parameters: [
            { name: "severity", in: "query", schema: { type: "string", enum: ["critical", "high", "medium", "low"] } },
            { name: "type", in: "query", schema: { type: "string" }, description: "Event type e.g. sql-injection" },
            { name: "projectId", in: "query", schema: { type: "string" } },
            { name: "action", in: "query", schema: { type: "string", enum: ["monitor", "block"] } },
            { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "page", in: "query", schema: { type: "integer", default: 0 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 50 } },
          ],
          responses: {
            200: { description: "Paginated events result", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/events/{id}": {
        parameters: [idParam("Event ID")],
        get: {
          tags: ["events"],
          summary: "Get a security event",
          operationId: "getEvent",
          security: sessionSecurity,
          responses: {
            200: { description: "Event object", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ rules
      "/rules": {
        get: {
          tags: ["rules"],
          summary: "List detection rules",
          operationId: "listRules",
          security: sessionSecurity,
          responses: {
            200: { description: "Array of rules", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          tags: ["rules"],
          summary: "Create a detection rule (admin only)",
          operationId: "createRule",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "type"],
                  properties: {
                    name: { type: "string", minLength: 1 },
                    type: { type: "string", minLength: 1 },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"], default: "medium" },
                    description: { type: "string" },
                    enabled: { type: "boolean", default: true },
                    config: { description: "Rule-specific configuration object" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Rule created", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/rules/{id}": {
        parameters: [idParam("Rule ID")],
        patch: {
          tags: ["rules"],
          summary: "Update a detection rule (admin only)",
          operationId: "updateRule",
          security: sessionSecurity,
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", minLength: 1 },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    description: { type: "string" },
                    enabled: { type: "boolean" },
                    config: { description: "Rule-specific configuration" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Rule updated", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        delete: {
          tags: ["rules"],
          summary: "Delete a detection rule (admin only)",
          operationId: "deleteRule",
          security: sessionSecurity,
          responses: {
            204: { description: "Deleted" },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ redaction-policies
      "/redaction-policies": {
        get: {
          tags: ["redaction-policies"],
          summary: "List redaction policies",
          operationId: "listRedactionPolicies",
          security: sessionSecurity,
          responses: {
            200: { description: "Array of redaction policies", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          tags: ["redaction-policies"],
          summary: "Create and publish a redaction policy",
          operationId: "createRedactionPolicy",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["projectId", "mode"],
                  properties: {
                    projectId: { type: "string" },
                    mode: { type: "string", enum: ["denylist", "allowlist", "metadata-only", "local-only"] },
                    rules: { description: "Redaction rules configuration" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Redaction policy created", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/redaction-policies/{id}": {
        parameters: [idParam("Redaction Policy ID")],
        patch: {
          tags: ["redaction-policies"],
          summary: "Update a redaction policy",
          operationId: "updateRedactionPolicy",
          security: sessionSecurity,
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mode: { type: "string", enum: ["denylist", "allowlist", "metadata-only", "local-only"] },
                    rules: { description: "Redaction rules configuration" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Policy updated", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ api-discovery
      "/api-discovery": {
        get: {
          tags: ["api-discovery"],
          summary: "List discovered endpoints",
          operationId: "listDiscoveredEndpoints",
          security: sessionSecurity,
          parameters: [{ name: "projectId", in: "query", schema: { type: "string" } }],
          responses: {
            200: { description: "Array of discovered endpoints", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api-discovery/import-spec": {
        post: {
          tags: ["api-discovery"],
          summary: "Import an OpenAPI spec to reconcile shadow APIs",
          description: "Compares the provided OpenAPI spec against discovered endpoints. Endpoints not in the spec are flagged as shadow APIs; previously shadowed endpoints that appear in the spec are cleared.",
          operationId: "importApiSpec",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["paths"],
                  properties: {
                    openapi: { type: "string" },
                    info: { type: "object" },
                    paths: { type: "object", additionalProperties: true },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Reconciliation result",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      total: { type: "integer" },
                      specEndpoints: { type: "integer" },
                      newShadow: { type: "integer" },
                      cleared: { type: "integer" },
                    },
                  },
                },
              },
            },
            400: { description: "Invalid spec", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api-discovery/export": {
        post: {
          tags: ["api-discovery"],
          summary: "Export discovered endpoints as an OpenAPI spec",
          description: "Generates an OpenAPI 3.0 document from all observed runtime endpoints enriched with RASP risk metadata extensions.",
          operationId: "exportApiSpec",
          security: sessionSecurity,
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    projectId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "OpenAPI JSON document",
              content: {
                "application/json": { schema: { type: "object", additionalProperties: true } },
              },
              headers: {
                "Content-Disposition": { schema: { type: "string" }, description: 'attachment; filename="rasp-openapi.json"' },
              },
            },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ audit-logs
      "/audit-logs": {
        get: {
          tags: ["audit-logs"],
          summary: "List audit logs",
          description: "Returns the tamper-evident audit log for the current organization. Entries are hash-chained; use `GET /admin/audit/verify` to check integrity.",
          operationId: "listAuditLogs",
          security: sessionSecurity,
          responses: {
            200: { description: "Array of audit log entries", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ admin
      "/admin/audit/verify": {
        get: {
          tags: ["admin"],
          summary: "Verify audit log hash chain (admin only)",
          description: "Walks the entire audit log hash chain and returns the first broken link, if any (Addendum E.4.4).",
          operationId: "verifyAuditChain",
          security: sessionSecurity,
          responses: {
            200: {
              description: "Chain verification result",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                      brokenAt: { type: "string", nullable: true },
                      reason: { type: "string", nullable: true },
                    },
                  },
                },
              },
            },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/admin/audit/acknowledge": {
        post: {
          tags: ["admin"],
          summary: "Acknowledge a tampered audit log entry (admin only)",
          description: "Records an acknowledgement entry that extends the hash chain forward from the known break point (Addendum E.4.4).",
          operationId: "acknowledgeAuditTampering",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["brokenAt"],
                  properties: {
                    brokenAt: { type: "string", description: "ID of the broken audit log entry" },
                    note: { type: "string", maxLength: 2000 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Acknowledged", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/admin/approvals": {
        get: {
          tags: ["admin"],
          summary: "List dual-authorization requests (admin only)",
          operationId: "listApprovals",
          security: sessionSecurity,
          parameters: [{ name: "status", in: "query", schema: { type: "string", enum: ["pending", "approved", "rejected", "executed"] } }],
          responses: {
            200: { description: "Approval requests", content: { "application/json": { schema: { type: "object", properties: { requests: { type: "array", items: { type: "object", additionalProperties: true } } } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          tags: ["admin"],
          summary: "Raise a dual-authorization request (admin only)",
          description: "Creates a sensitive-action approval request. A second admin must approve before the action can be executed (Addendum E.4.3).",
          operationId: "raiseApproval",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["action"],
                  properties: {
                    action: { type: "string", enum: ["agent_version.rollback", "agent_version.quarantine", "platform.kill_switch", "tenant.crypto_shred"] },
                    target: { type: "string" },
                    payload: { type: "object", additionalProperties: true },
                    reason: { type: "string", maxLength: 2000 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Approval request created", content: { "application/json": { schema: { type: "object", properties: { request: { type: "object", additionalProperties: true } } } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/admin/approvals/{id}": {
        parameters: [idParam("Approval Request ID")],
        post: {
          tags: ["admin"],
          summary: "Approve or reject a dual-authorization request (admin only)",
          description: "Enforces separation of duties: the approver must differ from the requester (Addendum E.4.3).",
          operationId: "processApproval",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["action"],
                  properties: {
                    action: { type: "string", enum: ["approve", "reject"] },
                    reason: { type: "string", maxLength: 2000 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Request processed", content: { "application/json": { schema: { type: "object", properties: { request: { type: "object", additionalProperties: true } } } } } },
            400: { description: "Invalid action or separation-of-duties violation", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/admin/mfa": {
        post: {
          tags: ["admin"],
          summary: "Manage TOTP MFA enrollment",
          description: "Three actions: `enroll` (returns otpauth URL for QR), `confirm` (verifies first code and enables MFA), `disable` (removes MFA).",
          operationId: "manageMfa",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["action"],
                  properties: {
                    action: { type: "string", enum: ["enroll", "confirm", "disable"] },
                    token: { type: "string", pattern: "^\\d{6}$", description: "6-digit TOTP code (required for action=confirm)" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "MFA state updated", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Invalid request or TOTP code", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },

      // ------------------------------------------------------------------ backoffice
      "/backoffice/agent-versions": {
        get: {
          tags: ["backoffice"],
          summary: "List agent versions (admin only)",
          operationId: "listAgentVersions",
          security: sessionSecurity,
          responses: {
            200: { description: "Array of agent versions", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          tags: ["backoffice"],
          summary: "Register a new agent version (admin only)",
          operationId: "createAgentVersion",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["version", "channel"],
                  properties: {
                    version: { type: "string", description: "Semver string e.g. 1.2.3" },
                    channel: { type: "string", enum: ["stable", "early", "edge"] },
                    changelog: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Version created", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/backoffice/agent-versions/{id}/promote": {
        parameters: [idParam("Agent Version ID")],
        post: {
          tags: ["backoffice"],
          summary: "Promote an agent version to published (admin only)",
          operationId: "promoteAgentVersion",
          security: sessionSecurity,
          responses: {
            200: { description: "Version promoted", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Version not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/backoffice/agent-versions/{id}/rollback": {
        parameters: [idParam("Agent Version ID")],
        post: {
          tags: ["backoffice"],
          summary: "Roll back an agent version (admin only)",
          description: "Halts and deprecates the version, then advertises the previous version to all affected agents. Records MTTR.",
          operationId: "rollbackAgentVersion",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["reason"],
                  properties: {
                    reason: { type: "string", minLength: 1 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Rollback result", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Version not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/backoffice/agent-versions/{id}/canary": {
        parameters: [idParam("Agent Version ID")],
        post: {
          tags: ["backoffice"],
          summary: "Drive canary rollout state machine (admin only)",
          description: "Controls the canary rollout: `start` (1%) → `advance` (1%→10%→50%→100%) → `halt`. `evaluate` runs the health check immediately.",
          operationId: "canaryAgentVersion",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["action"],
                  properties: {
                    action: { type: "string", enum: ["start", "advance", "halt", "evaluate"] },
                    reason: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Canary state updated", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Version not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/backoffice/agent-versions/{id}/quarantine": {
        parameters: [idParam("Agent Version ID")],
        post: {
          tags: ["backoffice"],
          summary: "Quarantine or release an agent version (admin only)",
          description: "Quarantining requires a prior dual-authorization approval (Addendum E.6).",
          operationId: "quarantineAgentVersion",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["quarantined"],
                  properties: {
                    quarantined: { type: "boolean" },
                    reason: { type: "string", maxLength: 2000 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Quarantine state updated", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required or approval required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            404: { description: "Version not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/backoffice/kill-switch": {
        get: {
          tags: ["backoffice"],
          summary: "Get platform kill-switch state (admin only)",
          operationId: "getKillSwitch",
          security: sessionSecurity,
          responses: {
            200: { description: "Kill-switch state", content: { "application/json": { schema: { type: "object", properties: { setting: { type: "object", additionalProperties: true } } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          tags: ["backoffice"],
          summary: "Toggle platform-wide kill-switch (admin only)",
          description: "Enabling the kill-switch requires a prior dual-authorization approval. When enabled all agents will self-disable on their next heartbeat (Addendum E.6).",
          operationId: "setKillSwitch",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["enabled"],
                  properties: {
                    enabled: { type: "boolean" },
                    reason: { type: "string", maxLength: 2000 },
                    approvalId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Kill-switch state updated", content: { "application/json": { schema: { type: "object", properties: { setting: { type: "object", additionalProperties: true } } } } } },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required or approval required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/backoffice/rollout-metrics": {
        get: {
          tags: ["backoffice"],
          summary: "Get rollout KPIs (admin only)",
          description: "Returns success rate, canary catch-rate, and average MTTR (Addendum D.5).",
          operationId: "getRolloutMetrics",
          security: sessionSecurity,
          responses: {
            200: { description: "Rollout KPIs", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/backoffice/organizations": {
        get: {
          tags: ["backoffice"],
          summary: "List all organizations (admin only)",
          operationId: "listOrganizations",
          security: sessionSecurity,
          responses: {
            200: { description: "Array of organizations", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/backoffice/version-exposure": {
        get: {
          tags: ["backoffice"],
          summary: "Get version exposure map (admin only)",
          description: "Returns the forensic mapping of which customers and agents run a specific agent version (Addendum E.6).",
          operationId: "getVersionExposure",
          security: sessionSecurity,
          parameters: [{ name: "version", in: "query", required: true, schema: { type: "string" }, description: "Semver string to look up" }],
          responses: {
            200: { description: "Exposure map", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
            400: { description: "version param required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/backoffice/contact-leads": {
        get: {
          tags: ["backoffice"],
          summary: "List contact leads (admin only)",
          operationId: "listContactLeads",
          security: sessionSecurity,
          responses: {
            200: { description: "Array of contact leads", content: { "application/json": { schema: { type: "array", items: { type: "object", additionalProperties: true } } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/backoffice/provision": {
        post: {
          tags: ["backoffice"],
          summary: "Provision a new organization and user (admin only)",
          description: "Creates an organization, owner user, and membership in a single transaction. Returns a temporary password that must be changed on first login.",
          operationId: "provisionAccount",
          security: sessionSecurity,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "orgName"],
                  properties: {
                    name: { type: "string", minLength: 1 },
                    email: { type: "string", format: "email" },
                    orgName: { type: "string", minLength: 1 },
                    plan: { type: "string", enum: ["free", "pro", "enterprise"], default: "free" },
                    leadId: { type: "string", description: "Contact lead ID to mark as converted" },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Account provisioned",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      userId: { type: "string" },
                      orgId: { type: "string" },
                      tempPassword: { type: "string", description: "Shown only once" },
                    },
                  },
                },
              },
            },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            409: { description: "Email already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
    },
  };
}
