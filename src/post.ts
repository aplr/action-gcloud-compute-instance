import * as core from "@actions/core"

import * as utils from "@google-github-actions/actions-utils"

import { Instance } from "./shared"
import { deleteInstance } from "./compute"

function getInstanceState(): Instance | undefined {
  const state = core.getState("instance")
  return state ? (JSON.parse(state) as Instance) : undefined
}

async function run(): Promise<void> {
  try {
    const shouldAutoDelete = core.getState("auto-delete") === "true"
    const instanceState = getInstanceState()

    if (!shouldAutoDelete) {
      core.info("auto-delete disabled, instance will not be deleted")
      return
    }

    if (!instanceState) {
      core.info("no instance created, nothing to delete")
      return
    }

    core.group("Delete Instance", () => deleteInstance(instanceState))
  } catch (err) {
    const msg = utils.errorMessage(err)
    core.setFailed(
      `aplr/actions-gcloud-compute-instance post failed with ${msg}`,
    )
  }
}

if (require.main === module) {
  run()
}
