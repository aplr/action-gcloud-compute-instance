import * as core from "@actions/core"
import * as github from "@actions/github"

import * as utils from "@google-github-actions/actions-utils"
import * as gcloud from "@google-github-actions/setup-cloud-sdk"

import { getConfig } from "./config"
import { createInstanceName } from "./util"
import { createInstance, getInstanceTemplateUrl } from "./compute"
import { backOff } from "exponential-backoff"
import { Instance } from "./shared"

// Do not listen to the linter - this can NOT be rewritten as an ES6 import statement.
// eslint-disable-next-line import/no-commonjs,@typescript-eslint/no-var-requires
const { version: appVersion } = require("../package.json")

async function ensureGcloud(): Promise<void> {
  if (!gcloud.isInstalled()) {
    throw new Error(
      "Google Cloud SDK is not installed. Install it using @google-github-actions/setup-gcloud.",
    )
  }

  const authenticated = await gcloud.isAuthenticated()
  if (!authenticated) {
    throw new Error(
      "Not authenticated with Google Cloud Platform. Authenticate using @google-github-actions/auth.",
    )
  }
}

async function createInstanceLogged(
  instanceName: string,
  templateUrl: string,
  project: string,
  zone: string,
) {
  try {
    core.info(
      `Creating instance ${instanceName} from template ${templateUrl}...`,
    )
    return await createInstance(instanceName, templateUrl, project, zone)
  } catch (err) {
    core.warning(
      `Failed to create instance ${instanceName} from template ${templateUrl}`,
    )
    throw err
  }
}

async function createInstanceWithRetry(
  instanceName: string,
  templateUrl: string,
  project: string,
  zone: string,
  numOfAttempts: number,
): Promise<Instance> {
  return await backOff(
    () => createInstanceLogged(instanceName, templateUrl, project, zone),
    {
      jitter: "full",
      startingDelay: 10_000,
      maxDelay: 300_000,
      timeMultiple: 3,
      numOfAttempts,
    },
  )
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
      github.context.repo.owner,
      github.context.repo.repo,
      github.context.runId,
    )

    // We set the instance state ahead of creating the instance. If the action
    // is interrupted while creating the instance, we still want to be able to
    // delete the instance, if it was created.

    // tell post to tear-down instance if requested
    core.saveState("auto-delete", config.autoDelete ? "true" : "false")
    // save instance state for post
    core.saveState("instance", {
      name: instanceName,
      project: config.project,
      zone: config.zone,
    })

    // create the instance, wait for it to be ready or skip if async was requested
    const instance = await core.group("Create Instance", () =>
      createInstanceWithRetry(
        instanceName,
        templateUrl,
        config.project,
        config.zone,
        config.retryOnFailure ? config.retryCount : 1,
      ),
    )

    // add instance details to output: ip, name, ...
    core.setOutput("instance_name", instance.name)
    core.setOutput("instance_ip", instance.ip)

    core.info(`Instance ${instance.name} created with IP ${instance.ip}`)
  } catch (err) {
    const msg = utils.errorMessage(err)
    core.setFailed(`aplr/actions-gcloud-compute-instance failed with ${msg}`)
  }
}

if (require.main === module) {
  run()
}
