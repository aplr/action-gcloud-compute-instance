import * as core from "@actions/core"
import * as github from "@actions/github"

import * as utils from "@google-github-actions/actions-utils"
import * as gcloud from "@google-github-actions/setup-cloud-sdk"

import { getConfig } from "./config"
import { createInstanceName } from "./util"
import { createInstance, getInstanceTemplateUrl } from "./compute"

// Do not listen to the linter - this can NOT be rewritten as an ES6 import statement.
// eslint-disable-next-line import/no-commonjs,@typescript-eslint/no-var-requires
const { version: appVersion } = require("../package.json")

async function ensureGcloud(): Promise<void> {
  const authenticated = await gcloud.isAuthenticated()
  if (!authenticated) {
    throw new Error(
      "Not authenticated with Google Cloud Platform. Authenticate using @google-github-actions/auth.",
    )
  }
}

async function run(): Promise<void> {
  core.exportVariable(
    "GCLOUD_GCE_METRICS_ENVIRONMENT",
    "github-actions-gce-instance",
  )
  core.exportVariable("GCLOUD_GCE_METRICS_ENVIRONMENT_VERSION", appVersion)

  try {
    await ensureGcloud()

    const config = await getConfig()

    // get the instance template instance
    // get the instance template name

    const templateUrl = await core.group("Retrieve Instance Template", () =>
      getInstanceTemplateUrl(config.sourceInstanceTemplate, config.project),
    )

    // generate an instance name based on prefix and run id
    const instanceName = createInstanceName(
      config.namePrefix,
      github.context.repo.repo,
      github.context.runId,
    )

    core.info(`Creating instance ${instanceName} from template ${templateUrl}`)

    // create the instance, wait for it to be ready or skip if async was requested
    const instance = await core.group("Create Instance", () =>
      createInstance(instanceName, templateUrl, config.project, config.zone),
    )

    // add instance details to output: ip, name, ...
    core.setOutput("instance_name", instance.name)
    core.setOutput("instance_ip", instance.ip)

    core.info(`Instance ${instance.name} created with IP ${instance.ip}`)

    // tell post to tear-down instance if requested
    core.saveState("auto-delete", config.autoDelete ? "true" : "false")
    // save instance state for post
    core.saveState("instance", {
      name: instanceName,
      project: config.project,
      zone: config.zone,
    })
  } catch (err) {
    const msg = utils.errorMessage(err)
    core.setFailed(`aplr/actions-gcloud-compute-instance failed with ${msg}`)
  }
}

if (require.main === module) {
  run()
}
