/**
 * OpenAPI 3 spec for Swagger UI (/api-docs).
 * Extend `paths` as you add routes.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Jira Confluencer / DevOps Intelligence API',
    description:
      'Backend for Jira, Confluence, and (later) GitHub webhooks. Jira routes require ATLASSIAN_* vars in .env.',
    version: '0.1.0',
  },
  servers: [
    {
      url: '/',
      description: 'Current host (same origin as this UI)',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Service is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/hello': {
      get: {
        tags: ['Demo'],
        summary: 'Hello world sample',
        operationId: 'getHello',
        responses: {
          '200': {
            description: 'Greeting',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'hello world' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/jira/issues/{issueKey}': {
      get: {
        tags: ['Jira'],
        summary: 'Get Jira issue by key',
        operationId: 'getJiraIssue',
        parameters: [
          {
            name: 'issueKey',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'DEMO-1' },
          },
        ],
        responses: {
          '200': {
            description: 'Issue summary',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          '502': { description: 'Jira API error' },
          '503': { description: 'Atlassian env not configured' },
        },
      },
    },
    '/api/jira/issues/{issueKey}/transitions': {
      get: {
        tags: ['Jira'],
        summary: 'List allowed workflow transitions',
        operationId: 'getJiraTransitions',
        parameters: [
          {
            name: 'issueKey',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'DEMO-1' },
          },
        ],
        responses: {
          '200': {
            description: 'Transitions',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/jira/issues/{issueKey}/status': {
      post: {
        tags: ['Jira'],
        summary: 'Transition issue to a target status name',
        operationId: 'postJiraStatus',
        parameters: [
          {
            name: 'issueKey',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'DEMO-1' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['statusName'],
                properties: {
                  statusName: {
                    type: 'string',
                    description: 'Target status name (e.g. Done, In Progress)',
                    example: 'Done',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Transition applied',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          '400': { description: 'No matching transition or bad body' },
        },
      },
    },
  },
  tags: [
    { name: 'System', description: 'Process and uptime' },
    { name: 'Demo', description: 'Examples while building' },
    { name: 'Jira', description: 'Jira Cloud REST (read issue, transitions, update status)' },
  ],
};
