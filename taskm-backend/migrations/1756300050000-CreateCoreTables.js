module.exports = class CreateCoreTables1756300050000 {
  name = 'CreateCoreTables1756300050000'

  async up(queryRunner) {
    // users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        avatar TEXT,
        refresh_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT`);

    // projects
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // tasks
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        assignee_id INTEGER,
        assignee_name VARCHAR(255),
        due_date TIMESTAMP,
        github_link VARCHAR(255),
        estimated_minutes INTEGER,
        substituted_minutes INTEGER,
        actual_minutes INTEGER,
        actual_started_at TIMESTAMP,
        project_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure optional AI/task metadata columns exist
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS substituted_minutes INTEGER`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_minutes INTEGER`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_started_at TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS metadata JSONB`);

    // attendance
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        check_in TIME,
        check_out TIME,
        break_start TIME,
        break_end TIME,
        status VARCHAR(50) DEFAULT 'present',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // leave_requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NOT NULL,
        hours_per_day INTEGER,
        work_location VARCHAR(255),
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // holidays
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL
      );
    `);

    // wfh_requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wfh_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        hours_per_day INTEGER,
        work_location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // notifications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // project_members (guarded even if also created in another migration)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role VARCHAR(50) DEFAULT 'member',
        status VARCHAR(20) DEFAULT 'pending',
        invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP NULL,
        CONSTRAINT uq_project_user UNIQUE (project_id, user_id)
      );
    `);

    // Foreign keys (safe DO blocks)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.projects') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_owner'
        ) THEN
          ALTER TABLE projects
          ADD CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.tasks') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_assignee'
        ) THEN
          ALTER TABLE tasks
          ADD CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.projects') IS NOT NULL AND to_regclass('public.tasks') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_project'
        ) THEN
          ALTER TABLE tasks
          ADD CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.attendance') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_user'
        ) THEN
          ALTER TABLE attendance
          ADD CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.leave_requests') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_leave_user'
        ) THEN
          ALTER TABLE leave_requests
          ADD CONSTRAINT fk_leave_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.wfh_requests') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_wfh_user'
        ) THEN
          ALTER TABLE wfh_requests
          ADD CONSTRAINT fk_wfh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.notifications') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_user'
        ) THEN
          ALTER TABLE notifications
          ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.projects') IS NOT NULL AND to_regclass('public.project_members') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_pm_project'
        ) THEN
          ALTER TABLE project_members
          ADD CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.project_members') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_pm_user'
        ) THEN
          ALTER TABLE project_members
          ADD CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner) {
    // Drop in reverse dependency order
    await queryRunner.query(`ALTER TABLE IF EXISTS project_members DROP CONSTRAINT IF EXISTS fk_pm_user`);
    await queryRunner.query(`ALTER TABLE IF EXISTS project_members DROP CONSTRAINT IF EXISTS fk_pm_project`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_members`);

    await queryRunner.query(`ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS fk_notifications_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);

    await queryRunner.query(`ALTER TABLE IF EXISTS wfh_requests DROP CONSTRAINT IF EXISTS fk_wfh_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS wfh_requests`);

    await queryRunner.query(`ALTER TABLE IF EXISTS leave_requests DROP CONSTRAINT IF EXISTS fk_leave_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_requests`);

    await queryRunner.query(`ALTER TABLE IF EXISTS attendance DROP CONSTRAINT IF EXISTS fk_attendance_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS attendance`);

    await queryRunner.query(`ALTER TABLE IF EXISTS tasks DROP CONSTRAINT IF EXISTS fk_tasks_project`);
    await queryRunner.query(`ALTER TABLE IF EXISTS tasks DROP CONSTRAINT IF EXISTS fk_tasks_assignee`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks`);

    await queryRunner.query(`ALTER TABLE IF EXISTS projects DROP CONSTRAINT IF EXISTS fk_projects_owner`);
    await queryRunner.query(`DROP TABLE IF EXISTS projects`);

    await queryRunner.query(`DROP TABLE IF EXISTS holidays`);

    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}


