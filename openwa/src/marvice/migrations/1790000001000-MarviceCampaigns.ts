import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marvice Modules — Campaigns: broadcasts to a contact list and their frozen recipient rows.
 * Hand-authored for both engines. No FK to sessions or lists (a deleted list must not erase the
 * campaign's send history); recipients cascade with their campaign.
 */
export class MarviceCampaigns1790000001000 implements MigrationInterface {
  name = 'MarviceCampaigns1790000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const pg = queryRunner.dataSource.options.type === 'postgres';
    const id = pg
      ? `"id" varchar PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::varchar`
      : `"id" varchar PRIMARY KEY NOT NULL`;
    const ts = pg ? 'timestamp NOT NULL DEFAULT NOW()' : `datetime NOT NULL DEFAULT (datetime('now'))`;
    const tsNull = pg ? 'timestamp' : 'datetime';

    if (!(await queryRunner.hasTable('marvice_campaigns'))) {
      await queryRunner.query(
        `CREATE TABLE "marvice_campaigns" (${id}, "sessionId" varchar NOT NULL, "listId" varchar NOT NULL, ` +
          `"name" varchar(100) NOT NULL, "message" text NOT NULL, "mediaUrl" text, "mediaType" varchar(10), ` +
          `"status" varchar(20) NOT NULL DEFAULT 'draft', "delayMs" integer NOT NULL DEFAULT 8000, ` +
          `"scheduledAt" ${tsNull}, "startedAt" ${tsNull}, "finishedAt" ${tsNull}, ` +
          `"total" integer NOT NULL DEFAULT 0, "sent" integer NOT NULL DEFAULT 0, "failed" integer NOT NULL DEFAULT 0, ` +
          `"skipped" integer NOT NULL DEFAULT 0, "currentBatchId" varchar(64), "batchSeq" integer NOT NULL DEFAULT 0, ` +
          `"lastError" text, "createdAt" ${ts}, "updatedAt" ${ts})`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_marvice_campaigns_session" ON "marvice_campaigns" ("sessionId", "createdAt")`,
      );
      await queryRunner.query(`CREATE INDEX "IDX_marvice_campaigns_status" ON "marvice_campaigns" ("status")`);
    }

    if (!(await queryRunner.hasTable('marvice_campaign_recipients'))) {
      await queryRunner.query(
        `CREATE TABLE "marvice_campaign_recipients" (${id}, "campaignId" varchar NOT NULL, "contactId" varchar NOT NULL, ` +
          `"phone" varchar(20) NOT NULL, "name" varchar(200), "variables" text, ` +
          `"status" varchar(12) NOT NULL DEFAULT 'pending', "batchId" varchar(64), "messageId" varchar(200), ` +
          `"error" text, "sentAt" ${tsNull}, ` +
          `CONSTRAINT "FK_marvice_campaign_recipients_campaignId" FOREIGN KEY ("campaignId") ` +
          `REFERENCES "marvice_campaigns" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "IDX_marvice_campaign_recipients_contact" ON "marvice_campaign_recipients" ("campaignId", "contactId")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_marvice_campaign_recipients_status" ON "marvice_campaign_recipients" ("campaignId", "status")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "marvice_campaign_recipients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marvice_campaigns"`);
  }
}
