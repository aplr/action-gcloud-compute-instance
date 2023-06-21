import * as core from "@actions/core"
import { compute_v1 as computeV1 } from "googleapis"
import * as gcloud from "@google-github-actions/setup-cloud-sdk"

import { Instance } from "./shared"

export async function getInstanceTemplateUrl(
  pattern: string,
  project: string,
): Promise<string> {
  core.info(`Looking for instance template '${pattern}'`)

  const uris: string[] = await gcloud.gcloudRunJSON([
    "compute",
    "instance-templates",
    "list",
    "--project",
    project,
    "--filter",
    `"name~'${pattern}'"`,
    "--uri",
  ])

  if (uris.length === 0) {
    throw new Error("No instance templates found")
  }

  core.info(`Found instance template with uri '${uris[0]}'`)

  return uris[0]
}

export async function createInstance(
  name: string,
  sourceInstanceTemplate: string,
  project: string,
  zone: string,
): Promise<Instance> {
  const result: computeV1.Schema$Instance[] = await gcloud.gcloudRunJSON([
    "compute",
    "instances",
    "create",
    name,
    "--source-instance-template",
    sourceInstanceTemplate,
    "--project",
    project,
    "--zone",
    zone,
  ])

  if (result.length === 0) {
    throw new Error(`Instance not found: ${name}`)
  }

  // TODO: probably it won't be the first network interface or access config
  const ip = result[0]?.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP
  if (!ip) {
    throw new Error("Instance IP not found")
  }

  return {
    name,
    zone,
    project,
    ip,
  }
}

export async function deleteInstance(state: Instance): Promise<void> {
  await gcloud.gcloudRunJSON([
    "compute",
    "instances",
    "delete",
    state.name,
    "--project",
    state.project,
    "--zone",
    state.zone,
  ])
}
