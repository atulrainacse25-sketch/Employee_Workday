const { EntitySchema } = require('typeorm');

const TaskSchema = new EntitySchema({
  name: 'Task',
  tableName: 'tasks',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true,
    },
    title: {
      type: 'varchar',
      length: 255,
      nullable: false,
    },
    description: {
      type: 'text',
      nullable: true,
    },
    status: {
      type: 'varchar',
      length: 50,
      nullable: false,
    },
    priority: {
      type: 'varchar',
      length: 50,
      nullable: false,
    },
    assigneeId: {
      name: 'assignee_id',
      type: 'int',
      nullable: true,
    },
    assigneeName: {
      name: 'assignee_name',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    dueDate: {
      name: 'due_date',
      type: 'timestamp',
      nullable: true,
    },
    githubLink: {
      name: 'github_link',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    estimatedMinutes: {
      name: 'estimated_minutes',
      type: 'int',
      nullable: true,
    },
    substitutedMinutes: {
      name: 'substituted_minutes',
      type: 'int',
      nullable: true,
    },
    actualMinutes: {
      name: 'actual_minutes',
      type: 'int',
      nullable: true,
    },
    actualStartedAt: {
      name: 'actual_started_at',
      type: 'timestamp',
      nullable: true,
    },
    projectId: {
      name: 'project_id',
      type: 'int',
      nullable: true,
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
    },
    updatedAt: {
      name: 'updated_at',
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
    },
  },
});

module.exports = TaskSchema;
