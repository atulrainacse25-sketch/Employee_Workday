module.exports = class CreateProjectMembers1756300000000 {
  name = 'CreateProjectMembers1756300000000'

  async up(queryRunner) {
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
    // Add FKs safely: only if referenced tables exist and constraint not present
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.projects') IS NOT NULL AND NOT EXISTS (
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
        IF to_regclass('public.users') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_pm_user'
        ) THEN
          ALTER TABLE project_members
          ADD CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE project_members DROP CONSTRAINT IF EXISTS fk_pm_user`);
    await queryRunner.query(`ALTER TABLE project_members DROP CONSTRAINT IF EXISTS fk_pm_project`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_members`);
  }
}


