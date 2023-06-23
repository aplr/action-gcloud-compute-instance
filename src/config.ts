import zod from "zod"

import * as core from "@actions/core"
import * as gcloud from "@google-github-actions/setup-cloud-sdk/dist"

const configSchema = zod.object({
  namePrefix: zod
    .string()
    // start with a alphanumeric character, allow hyphens and underscores as separators.
    .regex(/^[a-z0-9]([-_a-z0-9]*)?$/)
    .min(3)
    .max(24),
  zone: zod.string().nonempty(),
  project: zod.string().nonempty(),
  sourceInstanceTemplate: zod.string(),
  autoDelete: zod.boolean().optional().default(true),
  retryOnFailure: zod.boolean().optional().default(false),
  retryCount: zod.number().optional().default(5),
  // waitForInstance: zod.boolean().optional().default(true),
})

export type Config = zod.infer<typeof configSchema>

interface GcloudConfig {
  core?: {
    project?: string
  }
  compute?: {
    zone?: string
  }
}

export async function getConfig(): Promise<Config> {
  const defaultsFromGcloud = await getDefaultsFromGcloud()
  const actionInputs = Object.fromEntries(
    Object.entries(getActionInputs()).filter(([_, v]) => v !== undefined),
  )

  const config = {
    ...defaultsFromGcloud,
    ...actionInputs,
  }

  return await configSchema.parseAsync(config)
}

function getActionInputs(): Partial<Config> {
  return {
    namePrefix: core.getInput("name_prefix", { required: true }),
    project: core.getInput("project_id", { required: false }) ?? undefined,
    zone: core.getInput("zone", { required: false }) ?? undefined,
    sourceInstanceTemplate: core.getInput("source_instance_template", {
      required: true,
    }),
    autoDelete:
      core.getBooleanInput("auto_delete", { required: false }) ?? undefined,
    retryOnFailure: core.getBooleanInput("retry_on_failure", {
      required: false,
    }),
    // TODO: `parseFloat` might be error-prone :)
    retryCount: parseFloat(core.getInput("retry_count", { required: false })),
    // waitForInstance: core.getBooleanInput("wait_for_instance", {
    //   required: false,
    // }),
  }
}

async function getDefaultsFromGcloud(): Promise<Partial<Config>> {
  try {
    const config: GcloudConfig = await gcloud.gcloudRunJSON(["config", "list"])
    return {
      project: config?.core?.project,
      zone: config?.compute?.zone,
    }
  } catch {
    return {}
  }
}
