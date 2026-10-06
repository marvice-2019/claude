import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Marvice Modules — Contacts. One list name per session. Deliberately NO foreign key to sessions:
// OpenWA's backup restore deletes and re-inserts sessions, which would cascade away every list.
// Schema is owned by the MarviceContacts migration (the data connection never synchronizes on Postgres).
@Index('IDX_marvice_contact_lists_session_name', ['sessionId', 'name'], { unique: true })
@Entity('marvice_contact_lists')
export class ContactList {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  sessionId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
