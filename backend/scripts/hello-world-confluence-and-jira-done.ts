/**
 * 1) Update existing Confluence page "jira_confluence_integration" in space "Software Development"
 *    with Hello World API documentation.
 * 2) Transition Jira hello-world issue from In Progress → Done.
 *
 * Run: npm run sync:hello-doc-done
 * Optional .env: CONFLUENCE_SPACE_KEY (if space lookup by name fails), JIRA_HELLO_ISSUE_KEY (default KAN-1)
 */
import 'dotenv/config';
import { createConfluenceClientFromEnv } from '../src/integrations/confluence/confluenceClient.js';
import { updateIssueStatus } from '../src/services/jiraService.js';

/** Match page title in Confluence, or set CONFLUENCE_PAGE_TITLE in .env. */
const PAGE_TITLE = process.env.CONFLUENCE_PAGE_TITLE?.trim() || 'jira_confluence_integration';

function normTitle(t: string): string {
  return t
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}
const SPACE_NAME = 'Software Development';

function helloWorldDocStorageHtml(): string {
  return `<h1>Hello world &mdash; API documentation</h1>
<p>This page documents the sample <strong>Hello world</strong> endpoint in the Jira Confluencer Synchronizer backend.</p>
<h2>Endpoint</h2>
<ul>
<li><strong>Method:</strong> GET</li>
<li><strong>Path:</strong> /api/hello</li>
<li><strong>Response:</strong> JSON with a greeting message</li>
</ul>
<h2>Example response</h2>
<pre><code>{
  &quot;message&quot;: &quot;hello world&quot;
}</code></pre>
<h2>Implementation</h2>
<p>The route is registered in <code>backend/src/api/hello.ts</code> and mounted under the <code>/api</code> prefix in the Express app (<code>backend/src/http/app.ts</code>).</p>
<h2>Try it</h2>
<p>With the server running (<code>npm run dev</code>), open or call <code>http://localhost:3000/api/hello</code>. Swagger UI lists the same operation at <code>/api-docs</code>.</p>`;
}

async function main() {
  const cf = createConfluenceClientFromEnv();

  let spaceKey = process.env.CONFLUENCE_SPACE_KEY?.trim() || null;
  if (!spaceKey) {
    spaceKey = await cf.findSpaceKeyByName(SPACE_NAME);
  }
  if (!spaceKey) {
    throw new Error(
      `Could not find a space named "${SPACE_NAME}". Create it or set CONFLUENCE_SPACE_KEY in .env (see Confluence URL /spaces/KEY/).`,
    );
  }

  let page = await cf.findPageByTitle(spaceKey, PAGE_TITLE);
  if (!page) {
    const candidates = await cf.listPagesInSpace(spaceKey, 80);
    page =
      candidates.find((p) => normTitle(p.title) === normTitle(PAGE_TITLE)) ??
      candidates.find(
        (p) =>
          normTitle(p.title).includes('jira') && normTitle(p.title).includes('integration'),
      ) ??
      null;
  }
  const html = helloWorldDocStorageHtml();

  if (!page) {
    const created = await cf.createPage(spaceKey, PAGE_TITLE, html);
    process.stdout.write(
      `Confluence: created page "${PAGE_TITLE}" (id ${created.id}) in space ${spaceKey}\n`,
    );
  } else {
    const current = await cf.getPage(page.id);
    await cf.updatePageStorageBody(page.id, current.title, html, current.version + 1);
    process.stdout.write(`Confluence: updated page "${current.title}" (id ${page.id}) in space ${spaceKey}\n`);
  }

  const jiraKey = process.env.JIRA_HELLO_ISSUE_KEY?.trim() || 'KAN-1';
  const moved = await updateIssueStatus(jiraKey, 'Done');
  process.stdout.write(
    `Jira: ${jiraKey} moved to Done (transition: ${moved.appliedTransition.name})\n`,
  );
}

main().catch((err) => {
  process.stderr.write(err instanceof Error ? err.message : String(err));
  process.stderr.write('\n');
  process.exit(1);
});
