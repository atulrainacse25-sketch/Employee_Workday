module.exports = class AddAiLogsAndTaskMeta1756300100000 {
  name = 'AddAiLogsAndTaskMeta1756300100000'

  async up(queryRunner) {
    // add optional metadata column to tasks if not present (guarded)
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS metadata JSONB`);

    // create ai_logs table to store AI interactions and plans
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        task_id INTEGER,
        prompt TEXT,
        response JSONB,
        action VARCHAR(100),
        archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // add foreign keys if referenced tables exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.ai_logs') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_ailogs_user'
        ) THEN
          ALTER TABLE ai_logs
          ADD CONSTRAINT fk_ailogs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.tasks') IS NOT NULL AND to_regclass('public.ai_logs') IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_ailogs_task'
        ) THEN
          ALTER TABLE ai_logs
          ADD CONSTRAINT fk_ailogs_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE IF EXISTS ai_logs DROP CONSTRAINT IF EXISTS fk_ailogs_task`);
    await queryRunner.query(`ALTER TABLE IF EXISTS ai_logs DROP CONSTRAINT IF EXISTS fk_ailogs_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_logs`);
    // don't drop metadata column during down to avoid data loss in some environments, but clean up if required
    // If you need to revert archived flag, it's part of the ai_logs table which was dropped above.
  }
}


