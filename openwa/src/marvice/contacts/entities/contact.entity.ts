import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContactList } from './contact-list.entity';
import { DateTransformer } from '../../../common/transformers/date.transformer';
import { dateColumnType } from '../../../common/utils/column-types';

export type ContactWaStatus = 'pending' | 'on_whatsapp' | 'not_on_whatsapp' | 'check_failed';

// A phone number appears once per list (re-importing updates it in place). sessionId is denormalized
// so the STOP/START opt-out hook can find every list a number is on with one indexed query.
@Index('IDX_marvice_contacts_list_phone', ['listId', 'phone'], { unique: true })
@Index('IDX_marvice_contacts_session_phone', ['sessionId', 'phone'])
@Entity('marvice_contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  listId!: string;

  @ManyToOne(() => ContactList, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listId' })
  list!: ContactList;

  @Column({ type: 'varchar' })
  sessionId!: string;

  /** International digits, no '+', e.g. 919876543210. */
  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name!: string | null;

  /** Comma-separated, lower-cased. */
  @Column({ type: 'text', nullable: true })
  tags!: string | null;

  /** JSON object of extra CSV columns, usable as {{variables}} in campaigns. */
  @Column({ type: 'text', nullable: true })
  variables!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  whatsappId!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  waStatus!: ContactWaStatus;

  @Column({ type: 'boolean', default: true })
  optedIn!: boolean;

  @Column({ type: 'varchar', length: 40, nullable: true })
  optOutSource!: string | null;

  @Column({ type: dateColumnType(), nullable: true, transformer: DateTransformer })
  optedOutAt!: Date | null;

  @Column({ type: dateColumnType(), nullable: true, transformer: DateTransformer })
  verifiedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
