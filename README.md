# action-gcloud-compute-instance

The `action-gcloud-compute-instance` GitHub Action provisions a Google
[Compute Engine][cloud-run] instance. Currently, it can create instances
only from existing instance templates, however, this can be extended to
arbitrary instances in the future. After successful provisioning, the
instance name as well as it's IP is available as a GitHub Actions output
for use in future steps.

## Prerequisites

- This action requires Google Cloud credentials that are authorized to access
  the secrets being requested. See [Authorization](#authorization) for more
  information.

- This action runs using Node 16. If you are using self-hosted GitHub Actions
  runners, you must use runner version
  [2.285.0](https://github.com/actions/virtual-environments) or newer.

## Usage

```yaml
jobs:
  job_id:
    # ...

    permissions:
      contents: "read"
      id-token: "write"

    steps:
      - uses: "actions/checkout@v3"

      - uses: "google-github-actions/auth@v1"
        with:
          workload_identity_provider: "projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider"
          service_account: "my-service-account@my-project.iam.gserviceaccount.com"

      - id: "gce_instance"
        uses: "aplr/action-gcloud-compute-instance@v0.0.5"
        with:
          name_prefix: "my-instance"
          source_instance_template: "my-template"
          zone: "us-central1-a"
          project: "my-project"

      - name: "Use output"
        run: 'curl "${{ steps.gce_instance.outputs.instance_ip }}"'
```

## Inputs

- `name_prefix`: (Required) Prefix for the name of the VM.
  The name will be suffixed with information retrieved from the current
  github actions run context to ensure uniqueness.

- `project_id`: (Optional) ID of the Google Cloud project in which to deploy
  the service. The default value is computed from the environment.

- `zone`: (Optional) Zone in which to deploy the service. The default value
  is computed from the environment.

- `source_instance_template`: (Required) Name or pattern of the instance template
  to use for creating the VM. It has to exist in the same project as the VM prior
  to running this action.

- `auto_delete`: (Optional) Whether to automatically delete the instance when
  the action finishes. The default value is `true`.

## Outputs

- `instance_ip`: The IP address of the created instance.
- `instance_name`: The name of the created instance.

## Authorization

There are a few ways to authenticate this action. The caller must have
permissions to access the secrets being requested.

You will need to authenticate to Google Cloud as a service account with the
following roles:

- Compute Admin (`roles/compute.admin`):
  - Full control of all Compute Engine resources.

This service account needs to be a member of the `Compute Engine default service account`,
`(PROJECT_NUMBER-compute@developer.gserviceaccount.com)`, with role
`Service Account User`. To grant a user permissions for a service account, use
one of the methods found in [Configuring Ownership and access to a service account](https://cloud.google.com/iam/docs/granting-roles-to-service-accounts#granting_access_to_a_user_for_a_service_account).

### Via google-github-actions/auth

Use [google-github-actions/auth](https://github.com/google-github-actions/auth)
to authenticate the action. You can use [Workload Identity Federation][wif] or
traditional [Service Account Key JSON][sa] authentication.

```yaml
jobs:
  job_id:
    permissions:
      contents: "read"
      id-token: "write"

    steps:
      # ...

      - uses: "google-github-actions/auth@v1"
        with:
          workload_identity_provider: "projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider"
          service_account: "my-service-account@my-project.iam.gserviceaccount.com"

      - uses: "aplr/action-gcloud-compute-instance@v0.0.5"
        with:
          name_prefix: "my-instance"
          source_instance_template: "my-template"
```

### Via Application Default Credentials

If you are hosting your own runners, **and** those runners are on Google Cloud,
you can leverage the Application Default Credentials of the instance. This will
authenticate requests as the service account attached to the instance. **This
only works using a custom runner hosted on GCP.**

```yaml
jobs:
  job_id:
    steps:
      # ...

      - uses: "aplr/action-gcloud-compute-instance@v0.0.5"
        with:
          name_prefix: "my-instance"
          source_instance_template: "my-template"
```

The action will automatically detect and use the Application Default
Credentials.

## Versioning

We recommend pinning to the latest available major version:

```yaml
- uses: "aplr/action-gcloud-compute-instance@v0"
```

While this action attempts to follow semantic versioning, but we're ultimately
human and sometimes make mistakes. To prevent accidental breaking changes, you
can also pin to a specific version:

```yaml
- uses: "aplr/action-gcloud-compute-instance@v0.0.5"
```

However, you will not get automatic security updates or new features without
explicitly updating your version number. Note that we only publish `MAJOR` and
`MAJOR.MINOR.PATCH` versions. There is **not** a floating alias for
`MAJOR.MINOR`.

[compute-engine]: https://cloud.google.com/compute
[sa]: https://cloud.google.com/iam/docs/creating-managing-service-accounts
[wif]: https://cloud.google.com/iam/docs/workload-identity-federation
