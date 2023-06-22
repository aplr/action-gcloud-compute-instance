import slugify from "slugify"

export const createInstanceName = (
  prefix: string,
  owner: string,
  repo: string,
  runId: number,
) => slugify([prefix, owner, repo, runId].join("-"))
