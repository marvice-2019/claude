import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Campaign } from './campaign.entity';
import { DateTransformer } from '../../../common/transformers/date.transformer';
import { dateColumnType } from '../../../common/utils/column-types';

export type RecipientStatus = 'pending' | 'queued' | 'sent' | 'failed' | 'skipped';

/** One contact of a campaign, frozen at creation so later list edits don't change who it targets. */
@Index('IDX_marvice_campaign_recipients_contact', ['campaignId', 'contactId'], { unique: true })
@Index('IDX_marvice_campaign_recipients_status', ['campaignId', 'status'])
@Entity('marvice_campaign_recipients')
export class CampaignRecipient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  campaignId!: string;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaignId' })
  campaign!: Campaign;

  @Column({ type: 'varchar' })
  contactId!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name!: string | null;

  /** JSON copy of the contact's imported columns. */
  @Column({ type: 'text', nullable: true })
  variables!: string | null;

  @Column({ type: 'varchar', length: 12, default: 'pending' })
  status!: RecipientStatus;

  @Column({ type: 'varchar', length: 64, nullable: true })
  batchId!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  messageId!: string | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: dateColumnType(), nullable: true, transformer: DateTransformer })
  sentAt!: Date | null;
}
