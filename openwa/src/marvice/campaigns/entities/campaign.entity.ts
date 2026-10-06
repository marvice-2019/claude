import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DateTransformer } from '../../../common/transformers/date.transformer';
import { dateColumnType } from '../../../common/utils/column-types';

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
export type CampaignMediaType = 'image' | 'video' | 'document';

/** A one-off broadcast to a contact list. Recipients are snapshotted at creation (CampaignRecipient). */
@Index('IDX_marvice_campaigns_session', ['sessionId', 'createdAt'])
@Index('IDX_marvice_campaigns_status', ['status'])
@Entity('marvice_campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  sessionId!: string;

  @Column({ type: 'varchar' })
  listId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /** Body with {{name}}, {{phone}} and any imported column as {{variable}}. Caption when media is set. */
  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'text', nullable: true })
  mediaUrl!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  mediaType!: CampaignMediaType | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: CampaignStatus;

  /** Base gap between messages; the sender adds 0–2 s of jitter. */
  @Column({ type: 'int', default: 8000 })
  delayMs!: number;

  @Column({ type: dateColumnType(), nullable: true, transformer: DateTransformer })
  scheduledAt!: Date | null;

  @Column({ type: dateColumnType(), nullable: true, transformer: DateTransformer })
  startedAt!: Date | null;

  @Column({ type: dateColumnType(), nullable: true, transformer: DateTransformer })
  finishedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  total!: number;

  @Column({ type: 'int', default: 0 })
  sent!: number;

  @Column({ type: 'int', default: 0 })
  failed!: number;

  @Column({ type: 'int', default: 0 })
  skipped!: number;

  /** The upstream bulk batch currently sending a chunk of this campaign. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  currentBatchId!: string | null;

  @Column({ type: 'int', default: 0 })
  batchSeq!: number;

  /** Why the campaign is waiting (session offline, rate limit) — cleared when sending resumes. */
  @Column({ type: 'text', nullable: true })
  lastError!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
