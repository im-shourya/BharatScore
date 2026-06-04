import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class InitialSchema1705312200000 implements MigrationInterface {
  name = 'InitialSchema1705312200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqlDir = path.join(__dirname, '../../../../database/sql');
    
    // Execute SQL files in strict order per the spec
    const files = [
      '001-init.sql',
      '002-partitioning.sql',
      '003-indexes.sql',
      '004-roles-rls.sql',
      '005-retention-jobs.sql',
    ];

    for (const file of files) {
      const filePath = path.join(sqlDir, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        // Clean and execute. TypeORM queryRunner handles multi-statement if driver supports it, 
        // but for Postgres it usually works, or we can just rely on the raw sql files being valid.
        await queryRunner.query(sql);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // In a real environment, dropping everything carefully
    await queryRunner.query(`DROP SCHEMA public CASCADE;`);
    await queryRunner.query(`CREATE SCHEMA public;`);
    await queryRunner.query(`GRANT ALL ON SCHEMA public TO postgres;`);
    await queryRunner.query(`GRANT ALL ON SCHEMA public TO public;`);
  }
}
