import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marvice Modules — Contacts: contact lists and contacts, per WhatsApp session.
 * Hand-authored for both engines (the data connection never synchronizes on Postgres). No FK to
 * sessions on purpose: OpenWA's backup restore deletes sessions, which would cascade the lists away.
 */
export class MarviceContacts1790000000000 implements MigrationInterface {
  name = 'MarviceContacts1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const pg = queryRunner.dataSource.options.type === 'postgres';
    const id = pg
      ? `"id" varchar PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::varchar`
      : `"id" varchar PRIMARY KEY NOT NULL`;
    const ts = pg ? 'timestamp NOT NULL DEFAULT NOW()' : `datetime NOT NULL DEFAULT (datetime('now'))`;
    const tsNull = pg ? 'timestamp' : 'datetime';
    const bool = pg ? 'boolean NOT NULL DEFAULT true' : 'boolean NOT NULL DEFAULT (1)';

    if (!(await queryRunner.hasTable('marvice_contact_lists'))) {
      await queryRunner.query(
        `CREATE TABLE "marvice_contact_lists" (${id}, "sessionId" varchar NOT NULL, "name" varchar(100) NOT NULL, "description" text, "createdAt" ${ts}, "updatedAt" ${ts})`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "IDX_marvice_contact_lists_session_name" ON "marvice_contact_lists" ("sessionId", "name")`,
      );
    }

    if (!(await queryRunner.hasTable('marvice_contacts'))) {
      await queryRunner.query(
        `CREATE TABLE "marvice_contacts" (${id}, "listId" varchar NOT NULL, "sessionId" varchar NOT NULL, "phone" varchar(20) NOT NULL, "name" varchar(200), "tags" text, "variables" text, "whatsappId" varchar(120), "waStatus" varchar(20) NOT NULL DEFAULT 'pending', "optedIn" ${bool}, "optOutSource" varchar(40), "optedOutAt" ${tsNull}, "verifiedAt" ${tsNull}, "createdAt" ${ts}, "updatedAt" ${ts}, CONSTRAINT "FK_marvice_contacts_listId" FOREIGN KEY ("listId") REFERENCES "marvice_contact_lists" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "IDX_marvice_contacts_list_phone" ON "marvice_contacts" ("listId", "phone")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_marvice_contacts_session_phone" ON "marvice_contacts" ("sessionId", "phone")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_marvice_contacts_list_status" ON "marvice_contacts" ("listId", "waStatus")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "marvice_contacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marvice_contact_lists"`);
  }
}
