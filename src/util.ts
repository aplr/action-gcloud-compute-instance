import slugify from "slugify"

export const createInstanceName = (
  prefix: string,
  repo: string,
  runId: number,
) => [prefix, slugify(repo), runId].join("-")
