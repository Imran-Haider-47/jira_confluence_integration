import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'confluence_pages' })
export class ConfluencePage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({ name: 'space_key', type: 'varchar', length: 128, nullable: true })
  spaceKey!: string | null;

  @Column({ name: 'body_html', type: 'text' })
  bodyHtml!: string;

  @Column({ name: 'related_issue_key', type: 'varchar', length: 32 })
  relatedIssueKey!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
