
# mcgonagall

Transfigures terse cluster and resource specifications in TOML into Kubernetes manifests.

[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]

## Goal

mcgonagall provides TOML specifications that focus on the desired end state in high level terms, separate from technical implementation detail. mcgonagall does not provide implementation of Kubernetes API calls or of the entire manifest surface area. Its focus is solely the "transfiguration" of an opinionated specification to compatible Kubernetes manifests.

## Installation

```shell
npm i @npm-wharf/mcgonagall
```

## Use

## Lib API

### `mcgonagall.transfigure(source)`

The source can be a:

 * path to a folder
 * path to a tarball
 * URL to a git repository

Files can be nested to arbitrary folder levels (to help with organizing large specifications).

With only the path to the specification mcgonagall returns the full cluster specification as JSON:

```js
{
  namespaces: [], // list of namespaces uses in cluster
  levels: [], // sorted array of levels
  order: { // map of cardinal ordering to arrays of service spec keys
  },
  resources: { // map of service specs
  },
  configuration: [ // list of configuration specs
  ],
  secrets: [ // list of secret specs
  ],
  imagePullSecrets: [ // pull secrets are duplicated here
  ]
}
```

```js
const mcgonagall = require('mcgonagall')

mcgonagall
  .transfigure('./path/to/source')
  .then(
    cluster => {}
    err => {}
  )
```

### `mcgonagall.transfigure(source, [options])`

Providing a destination folder via the options hash will write the output to a set of folders, files and the cluster spec in the following structure:

```shell
--[./]
  |- cluster.json
  |- {namespace}/
     |- {deployment|statefulSet|daemonSet}.yml
     |- ? service.yml
     |- ? account.yml
     |- ? roleBinding.yml
     |- config/
        |- ? {config-file}.yml
        |- ? ...
  ...
```

```js
const mcgonagall = require('mcgonagall')

mcgonagall
  .transfigure('./path/to/source', { output: './path/to/output' })
  .then(
    done => {}
    err => {}
  )
```

Note: to change folder structure or file formats, just start with the cluster spec as JSON and persist it to disk another way.

### Controlling For Versions

Some Kubernetes API versions require changes to the manifests that get produced. As of now, the default Kubernetes API version is 1.9. To change this, provide a different version number via the `version` property in the option hash.

```js
const mcgonagall = require('mcgonagall')

mcgonagall
  .transfigure('./path/to/source', { 
    output: './path/to/output', 
    version: '1.6' 
  })
  .then(
    done => {}
    err => {}
  )
```

### Setting Cluster Scale

mcgonagall lets you provide an arbitrary set of comma delimited scale labels for a cluster in the `scaleOrder` property and then optionally specify scale factors for one or more of these labels per service.

This allows you to define how each label (after the initial label which represents the baseline) changes the baseline set. The intention is to prevent you from needing to have separate cluster specifications in order to have different resource requirements, limits, replica counts or mount storage sizes for clusters where the only change is in the expected utilization/size.

You optionally select which scale label to apply during transfiguration via the options hash:

```js
const mcgonagall = require('mcgonagall')

mcgonagall
  .transfigure('./path/to/source', { 
    output: './path/to/output',
    scale: 'medium',
    version: '1.8' 
  })
  .then(
    done => {}
    err => {}
  )
```

If you don't provide a scale for a cluster where they are specified, the lowest scale is assumed and no scale factors are applied.

### Tokenized Specifications

mcgonagall also support tokenized specifications that use the LoDash style tokens (`<%= %>`). To provide data for the tokens, use the `data` property on the `options` argument:

```js
const mcgonagall = require('mcgonagall')

mcgonagall
  .transfigure('./path/to/source', { 
    output: './path/to/output', 
    version: '1.6',
    data: {
      token1: 'value',
      token2: 100
    }
  })
  .then(
    done => {}
    err => {
      // if any tokens do not have a value provided, an error containing the
      // missing tokens under `tokens` property will be returned
    }
  )
```

### Secrets In Tokens

If the token name matches any of the following, then it will be hidden in the CLI:

 * ends in `pass`
 * contains `password`, `passwd`
 * contains `secret`, `secrt`, `scrt`, or `secure`

You can also hash tokens passed in so that they don't appear in clear text in your manifests using the `hash` method that looks like this:

```js
<%= hash('bcrypt', myVar) %> // base64 is the default
<%= hash('md5', myVar, 'hex') %>
```

See Use Cases for examples.

## CLI

The CLI allows you to get immediate output without having to write any code so you can test your specifications on the command line.

### Output To Standard Out

```shell
mcgonagall transfigure ./input | more

mcgonagall transfigure ./input << ./cluster.json
```

### Output To Full Directory
```shell
mcgonagall transfigure ./input ./output
```

### Tokenized Specifications

mcgonagall's tokenized specifications support for the CLI will prompt you to supply a value for each of the tokens found in the specification. 

To avoid the prompts, you can use the `--tokenFile` argument and supply an input file with key/values to supply the tokens. As with the API call, if any tokens are missing, the call will fail but in this case the CLI will attempt to get any additional tokens via interactive prompts.

## Specifications

Both specifications attempt to eliminate Kubernetes implementation details where possible and focus on minimal information needed to define our system as a collection of resources and configuration that can then be deployed to an available cluster with a list of possible scaling variations depending on target cluster size.

# Specification Format

The specification formats are in TOML. This choice was made partially due to its somewhat forgiving nature and ease of use for the task. In each case, a full example is presented first, and then a break-down of each section follows.

## Cluster Specification

The cluster specification identifies the resources, the order in which to create them, scaling factors for target cluster sizes and shared default configuration (if any). The scaling factors are expressed as number of containers to provision per service related to the baseline.

### Example Cluster Specification

```toml
scaleOrder = "small, medium, large, enterprise"
[data.postgres]
  order = 0
  [data.postgres.scale]
    medium = "ram > 500Mi < 750Mi; cpu >.75 < 1.25"
    large = "ram > 750Mi < 1Gi; cpu > 1.00 < 1.5; storage = data + 10Gi"
    enterprise = "ram > 1Gi < 1.5Gi; cpu > 1.25 < 2; storage = data + 20Gi"
[data.redis]
  order = 0
  [data.redis.scale]
    medium = "ram > 500Mi < 1Gi"
    large = "ram > 1Gi < 1.75Gi"
    enterprise = "ram > 1Gi < 2Gi"
[app.myservice]
  order = 1
  [data.myservice.scale]
    medium = "containers + 2"
    large = "containers + 4"
    enterprise = "containers + 8"

[configuration.app.shared]
  database_host = "data.postgres"
  database_port = 5432
  redis_url = "redis://redis.data:6379"

[secret.app.auth]
  database_username = "admin"
  database_password = "thisisapasswordyesitis"

[imagePullSecret.my-registry]
  namespaces = [ "app" ]
  registry = "https://my.registry.io"
  username = "service-account"
  password = "1234"
```

### [namespace.service-name]

Each service is represented by a table dictionary in TOML. This value *must* match the namespace and name of the service as it was given in `name` property of the resource specification file.

### `order`

The order value specifies what order the service will be created in. This value does not need to be unique and can be thought of as a 'round' during which all resources with the same order value will be created in parallel.

The next ordinal round of resources will not be sent to the Kubernetes API until the previous round of resources have been created successfully. This would respect interdependencies between resources and avoid failure/restart cascades across containers which in turn could lead to growing restart cool-downs and effectively malfunctioning clusters.

### `scaleOrder` and `[namespace.service-name.scale]`

#### `scaleOrder`

The `scaleOrder` property defines the ascending order for the scale designations. Because these are arbitrary for a given cluster and because each service may optionally specify any or none of these, mcgonagall requires an ordering to know how 'fill in the blanks'. When the requested scale is unspecified for a particular service, the first defined scale below the requested level will be used to populate it.

This is so that unspecified scales for a service have a "no change" affect rather than jumping up to the highest scale available.

#### Scaling Factors

The scale table optionally assigns scaling factors to the container based on the scale label. The scaling factors are `;` separated and can affect 4 different aspects of the service:

 * container count: `container [operator] [#]` where `operator` can be `=`, `+` or `*`
 * cpu limits: `cpu > [requirement] < [limit]`
 * ram limits: `ram > [requirement] < [limit]`
 * storage provisioned: `storage = [mount] + [increase], ...`

As with the resource specifications, RAM is expressed in `Mi` or `Gi` units and CPU limits are either fractional CPU cores or as a percentage using a `%` postfix.

When specifying increases to provisioned storage for stateful resources, be sure to match based on the mount name. Multiple mounts can be increased using a `,` to delimit the list.

> Note: when possible, try to limit scaling by container count first. The example above includes resources like postgres and redis specifically because these might be cases where increasing containers might pose an implementation challenge where just increasing resources is a simpler possible alternative. Changing resource limits and requirements may make it harder to predict how your containers behave between scale levels

### `[configuration.namespace.configuration-map-name]`

Multiple configuration maps can be specified, in any namespace, provided that they are prefixed by `configuration`. It is a simple key-value map intended to supply defaults to the resources.

The resource specifications will still have to opt in to the configuration maps defined in the cluster configurations (see the `env` section).

The purpose of the configuration map here is not to replace etcd as the preferred solution for configuration. Kubernetes does not presently provide any mechanism to alert containers on changes made to configuration maps. Updating running workloads to reflect configuration changes that rely solely on configuration maps is painful. 

Our containers currently provide a process host, kickerd, that monitors etcd keyspaces for changes and then restarts the process in the event of a relevant change. By combining the two, we can have workloads that start with sensible defaults for the cluster but respond to customizations stored in etcd.

### Configuration Files

Any configuration files that are mounted via volume mapping will get plugged into a configuration map and loaded into Kubernetes under the same namespace as their containing service.

#### NGiNX Conf

A special case for an `nginx.conf` file is made when it contains the tag `$SERVER_DEFINITIONS$`. Specifications with a `subdomain` in their `[service]` block will have an nginx location block  generated. All blocks generated this way will replace the `$SERVER_DEFINITIONS$` token in the `nginx.conf` file before it's placed in a ConfigMap manifest and stored in Kubernetes where it can be volume mounted to your NGiNX container.

This provides a simple way to handle dynamic, load-balanced ingress across containers.

You can see examples of this in action in the `/spec` folder under the `plain-source` (specs) and `plain-verify` (output) as well as the `tokenized-source` (specs) and `tokenized-verify` (output) folders.

### `[secret.namespace.secret-name]`

Secrets can also be defined at the namespace level for the cluster similarly to configuration maps and work the same way with the exception that they must be referenced as secrets from your resource specifications in order to use them.

### `[imagePullSecret.secret-name]`

Image pull secrets are special in that mcgonagall handles everythingso that you don't have to worry about creating it in a quoted JSON structure, base64 encoding it, or copy-pasting the same secret definition across multiple namespaces.

mcgonagall also compares the `registry` field in the imagePullSecret against the `image` field of specs in matching namespaces and if those match, mcgonagall will automaticall emit the necessary `imagePullSecret` stanza into that resource's Pod definition.

This means you'll never have to go through your cluster specifications adding, removing or changing these out. If the namespace and registry portion of the image match, mcgonagall will take care of the rest.

## Resource Specification

The resource specification captures the metadata necessary to define one or more resource manifests. Effort was made to eliminate Kubernetes implementation artifacts and stick to the data. The specification is bias towards creation of a single-container manifest with other manifests intended to support it.

It is possible to create a resource spec that is intended to generate a set of RBAC manifests or a Network Policy.

### Example Resource Specification

The following demonstrates how all the sections would work together. Well over 200 lines of Kubernetes manifests would be derived from this, not to mention the NGiNX configuration block for the reverse proxy used by the cluster.

```toml
name = "app-name.namespace"
stateful = true
daemon = false
job = false
image = "docker-repo/docker-image:latest"
command = "ash -exc node index.js"
metadata = "owner=npm;branch=master"

[scale]
  containers = 2
  ram = "> 500Mi < 1Gi"
  cpu = "> 50% < 100%"

[deployment]
  unavailable=1
  surge=100%
  deadline=15
  ready=10
  history=1
  restart = "Always|Never|OnFailure"
  backOff = 6

[env]
  ONE = "http://test:8080"
  [env.config-map]
    TWO = "a_key"

[ports]
  tcp = "9080"
  http = "8080"
  metrics = "5001.udp"

[mounts]
  data = "/data"
  config = "/etc/mydb"

[volumes]
  config = "actual-config::myapp.conf,auth.cert=cert/auth.cert"

[storage]
  data = "10Gi:exclusive"

[probes]
  ready = ":9999/_monitor/ping,initial=5,period=5,timeout=1,success=1,failure=3"
  live = "mydb test,initial=5,period=30"

[service]
  subdomain = "app-name"
  alias = "my-app"
  labels = "example=true"
  annotations = "service.alpha.kubernetes.io/tolerate-unready-endpoints=true"
  loadBalance = false
  shared = false
```

### top-level properties
Top level properties describe the name, type of service and Docker image that will be deployed.

 * `name` - the service name and namespace in `.` delimited format
 * `image` - the full Docker image specification
 * `stateful` - defaults to `false`; controls whether or not persistent storage will be assigned to the container
 * `command|arguments` - optionally provide the command or arguments to the Docker container
 * `metadata` - optional metadata to tag the service with, important for CD
 * `labels` - optional, nested label metadata for the specification (part of Kubernetes convention)
 * `shared` - optional, if set to true, omits generation of a new service with expectation that alias will match an existing service

#### name

This will affect how the service's implementing artifacts in Kubernetes gets named and labeled as well as the default DNS registration. Since getting clever and making these things different values is a "Bad Idea"(tm), having them set in one place is helpful and keeps us out of trouble.

#### stateful

If the service needs permanent storage (think databases) this should be set to true. This guarantees the service will select the correct manifest type during creation and allows storage provisioning without having to go through the cloud provider's APIs.

#### metadata

The metadata property provides a way to add custom properties to the service's metadata block. It takes a string with key value pairs separated by `;`s. Metadata in Kubernetes is often used to select and filter resources. As an example, Hikaru's continuous delivery can make use of metadata to determine if resources are eligible for upgrade given what appears to be a compatible Docker image.

#### shared

The purpose of `shared` is to address edge cases when you need to have multiple backing temporal pods from jobs/cronjobs that share a service through `alias` matching. This does mean one of the pods will need to expose a service without using `shared` and if the service needs to be reachable externally, have a `subdomain`.

> Note: `alias` collisions are possible for other types and can cause invalid cluster specifications. Only use matching aliases across jobs/cronjobs to share a fronting service.

### `[scale]`

Parameters to control how many containers will be provisioned, how much RAM and CPU will be reserved and what limits will be applied for each.

 * `containers` - defaults to 1 (can't be 0)
 * `ram` - optionally specify a minimum and/or maximum memory for the container
 * `cpu` - optionally specify a minimum and/or maximum CPU utilization for the container

`ram` and `cpu` specifications follow the form: '> requirement < limit' where the requirement affects whether or not a container can be scheduled and the limit affects if the container will be stopped if it exceeds the limit.

 * `ram` would be specified in units of `Ki`, `Mi` or `Gi`. 
 * `cpu` would be specified as fractional cores or percentage of a core using a `%` postfix (ex: `50%` is the same as `0.5`).

The containers parameter is intended to be the baseline/starting point/bare minimum number of containers needed for the service to work under normal circumstances. This is not meant to reflect customer/cluster size.

### `[env]`

Environment variables for the service's container can be specified as direct values, as references to a configuration map's key, or references to a secret key.

Configuration map references should fall under a block that includes the configuration map's name as a nested key (ex: `[env.my-config-map-name]`).

#### example

```toml
[env]
  AN_ENV = "http://ohlook:8080"

[env.my-config]
  MY_ENV = "config_map_key"
[env.secret-name]
  OTHER_ENV = "secret-key"
```

### `[ports]`

The ports block controls which ports will be exposed by the container, how they will be exposed, and how they will be registered with DNS. TCP is the assumed protocol unless `.udp` is postfixed to the port.

 * a port number by itself creates a container and target port
 * adding a number to the left of an `<=` changes the target port
 * adding a number to the right of an `=>` adds a node port
 * a `.tcp` or `.udp` postfix is always added to the container port (the "center" number)

#### example

```toml
[ports]
  http = "80" # creates a containerPort 80 targeting port 80
  https = "80<=443" # creates a containerPort 443 targeting port 80
  node = "8000=>8081" creates a container and targer port at 8000 with a node port at 8081
  all = "80<=8080=>8080" creates a container port 8080 targeting port 80 and a nodePort on 8080
  idk = "5050.udp"
```

### `[mounts]`

This block assigns a label to a specific path as a mount point so that files, host paths or a volume claim can later be mounted to it.

#### example

```toml
[mounts]
  storage = "/data"
  config-files = "/etc/my-app"
```

### `[volumes]`

Most often, these will be flat files that are going to get defined as a configuration map and then mounted to the container on start.

In some rare cases, it might make sense to mount host paths to the container itself.

> WARNING: don't get clever with this, containers move between hosts, you'll shoot your eye out, kid.

#### Flat Files as Volumes

The format for this should follow:

`name-of-the-mount = "config-map-name::file-name-1.ext:0644,file-name-2.ext,file-name-3.ext=relative/path/file-name-3.ext"`

 * the key is the name of the mount
 * the first value in string is an arbitrary, but unique name within the namespace to assign to this set of files
 * after the `::`, the list of files to be uploaded and mounted should be comma delimited
 * if the filename should be different in the container or needs to be in a path relative to the mount's location, provide that using an `=`
 * if you need to control the access mode for the files, you can provide it in octal mode after a single `:`

> Note: because of a quirk in how Kubernetes assigns the permissions, the most gracious permission mode provided (if multiple are) will be assigned to all files in the map

#### Host Paths as Volumes

Similar to the flat file approach, use the mount name as the key and the path on the host as the value:

`name-of-the-mount = "/path/on/the/host"`

#### example:
```toml
[volumes]
  config-files = "actual-config::mydb.conf,ssl.cert=cert/ssl.cert"
  host-mount = "/tmp/ohno"
```

#### Secrets as Volumes

Works similarly to flat files except instead of a config map name, use the keyword `secret` followed by the name of the secret:

`name-of-the-mount = "secret::secret-name"`

> Note: the same convention is used for controlling access modes here as with the flat-files

### `[storage]`

The storage block enumerates persistent storage requirements for resources that have specified `stateful = true`.

The key name should match the key name of a mount in the `[mounts]` block and the value should follow the form:

`[size]Gi:[access]`

where the `size` is the number of Gigabytes required and `access` is either `shared` or `exclusive`

#### example

```toml
[storage]
  data = "10Gi:exclusive"
```

### `[probes]`

Probes are an optional (but recommended) addition that allow Kubernetes to determine when the service is ready to accept requests (using a ready probe) as well as determine if a container should be restarted (using a live probe).

Each probe can use an HTTP check, a shell command within the container that relies on the exit code to determine success or failure of the check, or a TCP port based check that attempts to connect to the specified port.

The key should either be `ready` or `live` to specify the purpose of the probe and the value should either be the relative URL beginning with the port for an HTTP probe or a command line relative to the container's working directory.

Each check can also support the following, optional, comma delimited, arguments to adjust its behavior (all time units are in seconds):

 * `initial` - the initial amount of time to wait before trying the probe
 * `period` - the amount of time to wait between checking
 * `timeout` - the amount of time before a lack of response counts as a failure
 * `success` - the number of successes required after a failure to count as success
 * `failure` - the number of failed checks after a success before treated the service as failed

#### example

```toml
[probes]
  # http probe
  ready = ":9999/_monitor/ping,initial=5,period=5,timeout=1,success=1,failure=3"
  # tcp probe with port number
  ready = "port:9999"
  # tcp probe with named port
  ready = "port:http"
  # command probe
  live = "mydb test,initial=5,period=30"
```

### `[service]`

This section controls how the service is exposed via Kubernetes internal DNS and, potentially, via ingress points.

 * `subdomain` - controls whether an NGiNX block will be omitted for the service
 * `loadBalance` - `false` by default. Typically this should only be included on the NGiNX container used to handle ingress. It can be set to a string to change the `externalTrafficPolicy`
 * `alias` - optionally changes the default DNS registration for the service
 * `labels` - optionally add metadata.labels to the service definition (a Kubernetes convention)
 * `annotations` optionally add annotations to the service which can change certain behaviors (uncommon)
 * `affinity` - `false` by default. Setting it to `true` currently makes load balancing use client IP for "sticky" session style behaviors.
 * `externalName` - Used to change the service to an `ExternalName` type and return a CNAME from the `kube-dns`.


> Note: the `serviceAlias` is intended for use with StatefulSets to serve as the secondary namespace given to each named pod instance in DNS. If this is gibberish to you now, don't worry, as you learn about Kubernetes it will start to make sense.

### `[security]`

The security section exists to address Role Based Authentication (RBAC) - the feature set around accounts, roles and role bindings which provide access control to the Kubernetes API.

The properties of `account`, `role` and the sub-heading of `rules` (a TOML array) allow you to specify the account and role requirements for the service so that ServiceAccount, Role and RoleBinding resources will be created on your behalf where necessary.

Container process privileges can be controlled via `runAsUser`, `fsGroup` via the `context` property. `capabilities` can be listed out as well as turning on privilege escalation via the `escalation` flag when required. Use these behaviors with caution and make sure you understand the implications.

#### Example - heapster ClusterRole

Creates a `heapster` account and assign it to the `ClusterRole` feature:

```toml
[security]
  account = "heapster"
  role = "ClusterRole;system:heapster"
```

#### Example - namespace account assigned to existing role

Creates a viewer account assigned to the `view` Cluster Role

```toml
[security]
  account = "viewer"
  role = "ClusterRole;view"
```

#### Example - account viewer assigned to view role with explicit settings

In cases where you need to create an account and bind it to a role with access to specific API groups, resources and verbs, set `role` to a `Role` and use the `security.rules` to set specific details for the role itself.

```toml
[security]
  account = "viewer"
  role = "Role;view"
  [[security.rules]]
    groups = []
    resources = []
    resourceNames = [] # optionally filter by resource name
    verbs = []
```


#### Example - 

Escalates the container process's privileges, assigns it to a specific user and group and allows it specific capabilities.

```toml
[security]
  context = "user=1000;group=1000"
  capabilities = [ "NET_ADMIN", "SYS_TIME" ]
  escalation = true
```

#### API Group List

This is a (non-comprehensive) list of common API Groups:

 * "" - indicates core API group
 * "apps"
 * "batch"
 * "extensions"
 * "rbac.authorization.k8s.io"

#### Resource List

This is a (non-comprehensive) list of common resources

 * "configmaps"
 * "cronjobs"
 * "deployments"
 * "daemonsets"
 * "endpoints"
 * "events"
 * "ingresses"
 * "jobs"
 * "namespaces"
 * "networkpolicies"
 * "nodes"
 * "persistentvolumeclaims"
 * "pods"
 * "replicationcontrollers"
 * "secrets"
 * "services"
 * "serviceaccounts"
 * "statefulsets"

#### Verbs

This is a list of API verbs:

 * "bind"
 * "create"
 * "delete"
 * "deletecollection"
 * "get"
 * "list"
 * "patch"
 * "update"
 * "watch"

### [deployment]

The deployment section is a set of optional settings that control how Kubernetes will handle deployment and rolling-upgrades of the resource. Some of the options will depend on the kind of resource you intend to deploy.

> Note: please be sure you're familiar with the Kubernetes documentation before using or changing settings. It's a bad idea to fiddle with values to "see what will happen".

```toml
[deployment]
  pull = "IfNotAvailable"
  unavailable=1
  surge="100%"
  deadline=15
  ready=10
  history=1
  restart = "Always|Never|OnFailure"
  backoff = 6
  timeLimit = 0
  completions = 1
  schedule = "1 * * * *"
```
 
 * `pull` - controls when the image is pulled, defaults to `IfNotAvailable`
 * `unavailable` - limit how few pods must be in a ready state when performing a rolling upgrade (either whole number or percentage). Default is 1.
 * `surge` - limit how many pods can be in existence over the replicas count (either whole number or percentage). Default is 1.
 * `deadline` - how many seconds Kubernetes should wait before reporting the initial creation/upgrade as Progress Failed.
 * `ready` - how many seconds pods must be up without failing to report a create/rolling upgrade as Ready True
 * `history` - how many old versions to keep available for roll backs (default is 1)
 * `restart` - default depends on type of resource.
    * Default is `Always` for statefulSets, daemonSets and deployments
    * Default is `OnFailure` for jobs and cronJobs
 * `backoff` - used for jobs to control exponential backoff, default is 6
 * `timeLimit` - the number of seconds a job has to complete (including retries) before being marked as DeadlineExceeded.
 * `completions` - the number of jobs that should complete to consider the job done (defaults to 1)

The following table provides a reference for which properties are valid for which kinds of resource:

|   | Deployment  | StatefulSet | DaemonSet | Job/Cron Job |
|--:|:-:|:-:|:-:|:-:|
| `pull` | √ | √ | √ | √ |
| `unavailable` | √ |   |   |   |
| `surge` | √ |   |   |   |
| `deadline` | √ | √ |   | √ |
| `ready` | √ | √ |   |   |
| `history` | √ | √ | √ |   |
| `restart` |   |   |   | √ |
| `backoff` |   |   |   | √ |
| `timeLimit` |   |   |   | √ |
| `completions` |   |   |   | √ |
| `schedule` |   |   |   | √ |

## Cron Job Specifications

Those familiar with Cron Job specifications and the concurrency policy may be wondering how to set that.

Setting `scale.containers` > 0 is the same as `Allow` which will allow Cron Jobs that have unfinished to continue running thus resulting in overlap of the containers.

Setting `dployment.completions` to 1 is the same as `Forbid` meaning that if a scheduled job hasn't completed yet, the next one will be skipped.

Otherwise, the default will be `Replace` which will cancel the currently running job and start a new one.

### Schedule Format

The schedule string takes 5 positional arguments that look like:

```"* * * * *"```

From left to right, these arguments are:

 1. minute (0-59)
 1. hour (0-23)
 1. day of month (1-31)
 1. month (1-12)
 1. day of the week (0-6, Sunday=0)

Examples:

 * `* 20 * * 1-5` - every weekday at 8 PM
 * `* 1,4 * * * 0,5` - at 1am and 4am on Friday and Sunday
 * `* 0 1,15 * *` - midnight on the 1st and 15th of every month

### `[network]`

The network block lets you define a network policy. When included in a service definition (cronJob, DaemonSet, Deployment, Job, StatefulSet), the pod selector can be omitted and mcgonagall will use identifying information from the spec to select the current service's pod.

> Note: when mcgonagall generates manifests, it emits the name and namespace in the labels under metadata automatically to make selection by this criteria simple.

 * `selector` - a `;` delimitted set of key value pairs to select the pods by label
 * `[[network.ingress]]`
   * `from` - an array of strings to define various ways to allow ingress. Empty ingress results in all incoming traffic getting blocked.
   * `ports` - an array of ports to allow incoming traffic on
 * `[[network.egress]]`
   * `to` - an array of strings to define limits on outgoing traffic destinations
   * `ports` - an array of ports to allow outgoing traffic on

#### Ingress/Egress patterns

The following patterns are all legal ways to specify ingress or egress:

 * CIDR block:
   * `[ "172.17.0.0/16" ]`
 * CIDR block with an exception:
   * `[ "172.17.0.0/16 ! 172.17.1.0/24" ]`
 * By Namespace:
   * `[ "namespace=name:kube-system" ]`
   * `[ "namespace=label:value" ]`
 * By Pod
   * `[ "pod=label:value" ]`


#### Default Ingress Patterns

Deny All

```toml
[network]
  selector = ""
  [network.ingress]
```

Allow All

```toml
[network]
  selector = ""
  [network.ingress]
    from = []
```

#### Default Egress Patterns

Deny All

```toml
[network]
  selector = ""
  [network.egress]
```

Allow All

```toml
[network]
  selector = ""
  [network.egress]
    to = []
```

#### Port List

Both Ingress and Egress expect one or more port specifications that look like:
 
  * tcp ports - `[ "8080.tcp" ]`
  * udp ports - `[ "5084.udp" ]`

#### Example

```toml
[network]

```

# Use Cases

## Customizing All NGiNX Location Blocks

mcgonagall generates NGiNX location blocks for any resource with a `subdomain` property in its `[service]` block.

**default block**
```text
    server {
      listen    443 ssl;
      listen    [::]:443 ssl;
      root      /usr/share/nginx/html;

      ssl on;
      ssl_certificate       "<%=certPath%>";
      ssl_certificate_key   "<%=certKey%>";

      ssl_session_cache shared:SSL:1m;
      ssl_session_timeout 10m;
      ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
      ssl_ciphers HIGH:SEED:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!RSAPSK:!aDH:!aECDH:!EDH-DSS-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA:!SRP;
      ssl_prefer_server_ciphers on;

      server_name   ~^<%=subdomain%>[.].*$;

      location / {
        resolver            kube-dns.kube-system valid=1s;
        set $server         <%=fqdn%>.svc.cluster.local:<%=port%>;
        rewrite             ^/(.*) /$1 break;
        proxy_pass          http://$server;
        proxy_set_header    Host $host;
        proxy_set_header    X-Real-IP $remote_addr;
        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $scheme;
      }
    }
```

You can change the default block by placing a file named `default.location.conf` at the root of your project, next to the `cluster.toml` and mcgonagall will read it in and use it in place of its own.

mcgonagall will supply all the tokens to the template.

## Customizing Specific NGiNX Location Blocks

You can further override default NGiNX blocks per service by placing a `location.conf` in the folder next to the resource's `toml` spec. If multiple `toml` specs are in the same folder, you can specify which one the location file is for by prefixing it with the fqdn of the resource: `name.namespace.location.conf`

## Securing NGiNX Ingress via htpasswd

To secure your NGiNX endpoints using an htpasswd, you can avoid a pre-generated file and putting the username and password in clear text in your manifests.

Each approach will prompt you for a username and password during deployment and mask the password in the CLI. The bcrypted password would be placed in either a manifest or an output file pulled into a config/secret source.

### Stored As A File

An alternative would be to store an `htpasswd` file next to your NGiNX spec itself with the contents:

```bash
<%= userName %>:<%= hash('bcrypt', password) %>
```

Then reference the file from your NGiNX `toml` via a config mount:

```toml
[mount]
  auth = "/etc/nginx/auth"

[volume]
  auth = "auth::htpasswd"
```

The following lines can be added to any NGiNX block to secure it with the password:

```bash
  auth_basic           "closed site";
  auth_basic_user_file /etc/nginx/auth/htpasswd;
```

### Stored As Environment

```toml
[env]
  AUTH = "<%= userName %>:<%= hash('bcrypt', password) %>"
```

This gives you more flexibility to pick the value up and add it to a file but requires additional work. An upside to this is you can use this to seed a job with the value and have it stored and then build mechanisms to allow you to change it later and roll your NGiNX containers as a result.

## Unsupported Manifest Types

mcgonagall is an opinionated specification and so it doesn't (and can't really) support every possible manifest permutation available (nor do we really want it to).

Sometimes there will be custom manifests (like the etcd operator cluster manifests) that you may want to use in order to take advantage of really nice features. Rather than trying to build support for every possible Kubernetes extension into mcgonagall, there is support for including raw Kubernetes manifests in the cluster output.

To do this, change the extension of the manifest to `.raw.yml` and mcgonagall will read the manifest into the cluster data structure directly. Tokenization is still supported for these, but no other transformations will take place. It is important to understand that the namespace and name of the manifest should still be included in the cluster so that tools like hikaru will know how and when to deploy these manifests.

[travis-url]: https://travis-ci.org/npm-wharf/mcgonagall
[travis-image]: https://travis-ci.org/npm-wharf/mcgonagall.svg?branch=master
[coveralls-url]: https://coveralls.io/github/npm-wharf/mcgonagall
[coveralls-image]: https://coveralls.io/repos/github/npm-wharf/mcgonagall/badge.svg?branch=master
