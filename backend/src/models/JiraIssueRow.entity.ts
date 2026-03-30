import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Local mirror / cache of Jira work (not the live Jira API row). */
@Entity({ name: 'jira_issues' })
export class JiraIssueRow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'issue_key', type: 'varchar', length: 32, unique: true })
  issueKey!: string;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({ type: 'varchar', length: 128 })
  status!: string;

  @Column({ name: 'project_key', type: 'varchar', length: 32 })
  projectKey!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
