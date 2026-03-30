/** Subset of GET /rest/api/3/issue/{key} we expose from our API */
export type JiraIssueSummary = {
  key: string;
  id: string;
  summary: string;
  status: {
    name: string;
    id: string;
  };
  issueType: { name: string };
  project: { key: string; name: string };
};

export type JiraTransition = {
  id: string;
  name: string;
  to: { name: string; id: string };
};
