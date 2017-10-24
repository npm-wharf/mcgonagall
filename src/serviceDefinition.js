const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const expressionParser = require('./expressionParser')
const toml = require('toml-j0.4')
const validation = require('./validation')
const tokenizer = require('./tokenizer')

/** `Object#toString` result references. */
const BOOL_TAG = '[object Boolean]'
const DATE_TAG = '[object Date]'
const NUMBER_TAG = '[object Number]'
const STRING_TAG = '[object String]'
const NOT_AN_OBJECT = ''
const API_VERSION_MAP = require('./apiVersionMap')
const DEPLOYMENT_DEFAULTS = {
  unavailable: 1,
  surge: 1,
  history: 1
}

function buildService (config) {
  const result = validation.validateConfig(config)
  if (result.error) {
    throw new Error(`Error building specification for '${config.name}' due to validation errors:\n\t${result.error}`)
  }
  const [name, namespace] = config.name.split('.')
  config.name = name
  config.namespace = namespace

  const definition = {
    fqn: [name, namespace].join('.'),
    name: name,
    namespace: namespace
  }

  if (config.ports) {
    const service = getService(config)
    Object.assign(definition, service)
  }

  if (config.job) {
    let job = config.deployment.schedule
      ? getCronJob(config) : getJob(config)
    Object.assign(definition, job)
  } else if (config.stateful) {
    const set = getStatefulSet(config)
    Object.assign(definition, set)
  } else if (config.daemon) {
    const daemon = getDaemonSet(config)
    Object.assign(definition, daemon)
  } else {
    const deployment = getDeployment(config)
    Object.assign(definition, deployment)
  }

  if (config.service.subdomain && !config.daemon) {
    const nginx = buildNginxBlock(config)
    Object.assign(definition, nginx)
  }

  if (config.security) {
    if (config.security.account) {
      const account = getAccount(config)
      Object.assign(definition, account)
    }
    if (config.security.role) {
      const roleBinding = getRoleBinding(config)
      Object.assign(definition, roleBinding)
    }
  }

  return definition
}

function buildNginxBlock (config) {
  const fqdn = [config.name, config.namespace].join('.')
  const port = config.port
  return { nginxBlock: `
    server {
      listen    443 ssl;
      listen    [::]:443 ssl;
      root      /usr/shar/nginx/html;

      ssl on;
      ssl_certificate       "/etc/nginx/cert/cert.pem";
      ssl_certificate_key   "/etc/nginx/cert/cert.pem";

      ssl_session_cache shared:SSL:1m;
      ssl_session_timeout 10m;
      ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
      ssl_ciphers HIGH:SEED:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!RSAPSK:!aDH:!aECDH:!EDH-DSS-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA:!SRP;
      ssl_prefer_server_ciphers on;

      server_name   ~^${config.service.subdomain}[.].*$;

      location / {
        resolver            kube-dns.kube-system valid=1s;
        set $server         ${fqdn}.svc.cluster.local:${port};
        rewrite             ^/(.*) /$1 break;
        proxy_pass          http://$server;
        proxy_set_header    Host $host;
        proxy_set_header    X-Real-IP $remote_addr;
        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $scheme;
      }
    }` }
}

function clone (source, target) {
  const tag = getObjectTag(source)
  if (source == null || typeof source !== 'object') {
    return source
  } else if (!isObject(source) && !Array.isArray(source)) {
    return source
  } else if (tag === BOOL_TAG || tag === STRING_TAG ||
            tag === NUMBER_TAG || tag === DATE_TAG) {
    return new source.constructor(source)
  }

  target = target || new source.constructor()
  for (var key in source) {
    target[ key ] = typeof target[ key ] === 'undefined' ? clone(source[ key ], null) : target[ key ]
  }
  return target
}

function getAccount (config) {
  return {
    account: {
      apiVersion: getApiVersion(config, 'account'),
      kind: 'ServiceAccount',
      metadata: {
        name: config.security.account,
        namespace: config.namespace
      }
    }
  }
}

function getApiVersion (config, type) {
  return API_VERSION_MAP[type][config.apiVersion]
}

function getContainer (config) {
  const resources = { resources: {} }
  let command = null
  let args = null
  let env = []
  let ports = []

  if (config.scale) {
    if (config.scale.ram) {
      expressionParser.addResource(resources, 'ram', config.scale.ram)
    }
    if (config.scale.cpu) {
      expressionParser.addResource(resources, 'cpu', config.scale.cpu)
    }
  }
  if (config.env) {
    env = expressionParser.parseEnvironmentBlock(config.env)
  }
  if (config.ports) {
    ports = expressionParser.parsePorts(config.ports)

    if (!config.port) {
      if (ports.length === 1) {
        config.port = ports[0].containerPort
      } else {
        ports.forEach(p => {
          if (/http/.test(p.name)) {
            config.port = p.containerPort
          }
        })
      }
    }
  }

  const container = {
    name: config.name,
    image: config.image
  }

  if (env.length) {
    container.env = env
  }

  if (ports.length) {
    container.ports = ports
  }

  Object.assign(container, resources)

  if (config.command) {
    command = expressionParser.parseCommand(config.command)
    Object.assign(container, command)
  }

  if (config.args) {
    args = expressionParser.parseArgs(config.args)
    Object.assign(container, args)
  }

  if (config.security) {
    const security = {
      securityContext: {}
    }
    if (config.security.escalation) {
      security.securityContext.allowPrivilegeEscalation = true
    }
    if (config.security.capabilities) {
      security.securityContext.capabilities = config.security.capabilities
    }
    if (config.security.context) {
      Object.assign(security.securityContext, expressionParser.parseContext(config.security.context))
    }
    if (Object.keys(security.securityContext).length > 0) {
      Object.assign(container, security)
    }
  }

  if (config.pull) {
    container.imagePullPolicy = config.deployment.pull
  }

  if (config.probes) {
    if (config.probes.ready) {
      container.readinessProbe = expressionParser.parseProbe(config.probes.ready)
    }
    if (config.probes.live) {
      container.livenessProbe = expressionParser.parseProbe(config.probes.live)
    }
  }

  if (config.mounts) {
    const mountKeys = Object.keys(config.mounts)
    container.volumeMounts = mountKeys.reduce((acc, mountName) => {
      acc.push({
        name: mountName,
        mountPath: config.mounts[mountName]
      })
      return acc
    }, [])
  }

  return container
}

function getCronJob (config) {
  const container = getContainer(config)
  const volumes = getVolumes(config)
  const volumeClaims = getVolumeClaims(config)
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  let concurrency
  if (config.scale && config.scale.containers) {
    concurrency = 'Allow'
  } else if (config.completions === 1) {
    concurrency = 'Forbid'
  } else {
    concurrency = 'Replace'
  }
  const definition = {
    cronJob: {
      apiVersion: getApiVersion(config, 'cronjob'),
      kind: 'CronJob',
      metadata: {
        namespace: config.namespace,
        name: config.name
      },
      spec: {
        successfulJobsHistoryLimit: config.deployment.history || 1,
        failedJobsHistoryLimit: config.deployment.history || 1,
        concurrencyPolicy: concurrency,
        template: {
          metadata: {
            labels: {
              app: config.name
            }
          },
          spec: {
            containers: [ container ],
            restartPolicy: config.deployment.restart || 'Never',
            backoffLimit: config.deployment.backoff || 6,
            volumes: volumes
          }
        },
        volumeClaimTemplates: volumeClaims
      }
    }
  }
  if (config.deployment.timeLimit) {
    definition.cronJob.spec.startingDeadlineSeconds = config.deployment.timeLimit
  }

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.cronJob.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.cronJob.metadata, metadata || {})
  return definition
}

function getDaemonSet (config) {
  const container = getContainer(config)
  const volumes = getVolumes(config)
  const volumeClaims = getVolumeClaims(config)
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  const definition = {
    daemonSet: {
      apiVersion: getApiVersion(config, 'daemonSet'),
      kind: 'DaemonSet',
      metadata: {
        namespace: config.namespace,
        name: config.name
      },
      spec: {
        replicas: config.scale ? config.scale.containers : 1,
        revisionHistoryLimit: config.deployment.history,
        template: {
          metadata: {
            labels: {
              app: config.name
            }
          },
          spec: {
            containers: [ container ],
            volumes: volumes
          },
          volumeClaimTemplates: volumeClaims
        }
      }
    }
  }

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.daemonSet.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.daemonSet.metadata, metadata || {})
  return definition
}

function getDeployment (config) {
  const container = getContainer(config)
  const volumes = getVolumes(config)
  const volumeClaims = getVolumeClaims(config)
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  const definition = {
    deployment: {
      apiVersion: getApiVersion(config, 'deployment'),
      kind: 'Deployment',
      metadata: {
        namespace: config.namespace,
        name: config.name
      },
      spec: {
        replicas: config.scale ? config.scale.containers : 1,
        revisionHistoryLimit: config.deployment.history,
        strategy: {
          rollingUpdate: {
            maxUnavailable: config.deployment.unavailable,
            maxSurge: config.deployment.surge
          }
        },
        template: {
          metadata: {
            labels: {
              app: config.name
            }
          },
          spec: {
            containers: [ container ],
            volumes: volumes
          }
        },
        volumeClaimTemplates: volumeClaims
      }
    }
  }

  if (config.deployment.deadline) {
    definition.deployment.spec.progressDeadlineSeconds = config.deployment.deadline
  }
  if (config.deployment.ready) {
    definition.deployment.spec.minReadySeconds = config.deployment.ready
  }

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.deployment.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.deployment.metadata, metadata || {})
  return definition
}

function getJob (config) {
  const container = getContainer(config)
  const volumes = getVolumes(config)
  const volumeClaims = getVolumeClaims(config)
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  const definition = {
    job: {
      apiVersion: getApiVersion(config, 'job'),
      kind: 'Job',
      metadata: {
        namespace: config.namespace,
        name: config.name
      },
      spec: {
        parallelism: config.scale.containers,
        completions: config.deployment.completions || config.scale.containers,
        template: {
          metadata: {
            labels: {
              app: config.name
            }
          },
          spec: {
            containers: [ container ],
            restartPolicy: config.deployment.restart || 'Never',
            backoffLimit: config.deployment.backoff || 6,
            volumes: volumes
          }
        },
        volumeClaimTemplates: volumeClaims
      }
    }
  }

  if (config.deployment.timeLimit) {
    definition.job.spec.activeDeadlineSeconds = config.deployment.timeLimit
  }

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.job.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.job.metadata, metadata || {})
  return definition
}

function getObjectTag (value) {
  if (!isObject(value)) {
    return NOT_AN_OBJECT
  }
  return Object.prototype.toString.call(value)
}

function getRoleBinding (config) {
  const roleParts = config.security.role.split(';')
  let clusterRole = false
  let role = ''
  if (roleParts.length > 1) {
    clusterRole = roleParts[0] === 'ClusterRole'
    role = roleParts[1]
  } else {
    role = roleParts[0]
  }

  if (clusterRole) {
    const definition = {
      roleBinding: {
        apiVersion: getApiVersion(config, 'roleBinding'),
        kind: 'ClusterRoleBinding',
        metadata: {
          name: config.security.account
        },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: role
        },
        subjects: [
          {
            kind: 'ServiceAccount',
            name: config.security.account,
            namespace: config.namespace
          }
        ]
      }
    }
    return definition
  }
}

function getService (config) {
  const definition = {
    services: []
  }

  const service = {
    apiVersion: getApiVersion(config, 'service'),
    kind: 'Service',
    metadata: {
      namespace: config.namespace,
      name: config.service.alias || config.name,
      labels: {
        app: config.service.alias || config.name
      }
    },
    spec: {
      selector: {
        app: config.name
      },
      ports: [
      ]
    }
  }

  if (config.service.labels) {
    const metadata = expressionParser.parseMetadata(config.service.labels)
    Object.assign(service.metadata.labels, metadata)
  }

  if (config.service.annotations) {
    const metadata = expressionParser.parseMetadata(config.service.annotations)
    service.metadata.annotations = metadata
  }

  const ports = expressionParser.parsePorts(config.ports, true)
  service.spec.ports = ports

  if (config.stateful) {
    if (config.service.alias && config.service.alias !== config.name) {
      const statefulService = clone(service)
      statefulService.spec.clusterIP = 'None'
      service.metadata.name = config.name
      service.metadata.labels.app = config.name
      definition.services.push(statefulService)
    } else {
      service.spec.clusterIP = 'None'
    }
  }

  if (_.some(service.spec.ports, port => port.nodePort)) {
    service.spec.type = 'NodePort'
  }

  if (config.service.loadbalance || config.service.loadBalance) {
    const policy = (config.service.loadbalance || config.service.loadBalance)
    service.spec.type = 'LoadBalancer'
    if (_.isString(policy)) {
      service.spec.externalTrafficPolicy = policy
    }
  }

  if (config.service.affinity) {
    service.spec.sessionAffinity = 'ClientIP'
  }

  if (config.service.externalName || config.service.externalname) {
    service.spec.type = 'ExternalName'
  }

  definition.services.push(service)

  return definition
}

function getStatefulSet (config) {
  const container = getContainer(config)
  const volumes = getVolumes(config)
  const volumeClaims = getVolumeClaims(config)
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  const definition = {
    statefulSet: {
      apiVersion: getApiVersion(config, 'statefulSet'),
      kind: 'StatefulSet',
      metadata: {
        namespace: config.namespace,
        name: config.name
      },
      spec: {
        serviceName: config.service.alias,
        replicas: config.scale.containers,
        revisionHistoryLimit: config.deployment.history || 1,
        updateStrategy: {
          type: 'RollingUpdate'
        },
        template: {
          metadata: {
            labels: {
              app: config.name
            }
          },
          spec: {
            containers: [ container ],
            volumes: volumes
          }
        },
        volumeClaimTemplates: volumeClaims
      }
    }
  }

  if (config.deployment.deadline) {
    definition.statefulSet.spec.progressDeadlineSeconds = config.deployment.deadline
  }
  if (config.deployment.ready) {
    definition.statefulSet.spec.minReadySeconds = config.deployment.ready
  }

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.statefulSet.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.statefulSet.metadata, metadata || {})
  return definition
}

function getVolumes (config) {
  if (config.volumes) {
    const volumeKeys = Object.keys(config.volumes)
    return volumeKeys.reduce((acc, key) => {
      const volumeMap = expressionParser.parseVolume(key, config.volumes[key])
      if (volumeMap.configMap && config.addConfigFile) {
        volumeMap.configMap.items.forEach(item => {
          config.addConfigFile(
            [config.namespace, volumeMap.configMap.name].join('.'),
            item.key,
            item.path
          )
        })
      }
      acc.push(volumeMap)
      return acc
    }, [])
  } else {
    return undefined
  }
}

function getVolumeClaims (config) {
  if (config.storage) {
    const storageKeys = Object.keys(config.storage)
    return storageKeys.reduce((acc, key) => {
      acc.push(expressionParser.parseStore(key, config.storage[key], config.namespace))
      return acc
    }, [])
  } else {
    return undefined
  }
}

function isObject (value) {
  const type = typeof value
  return value != null && (type === 'object' || type === 'function')
}

function parseTOMLFile (filePath, options = {}) {
  const addConfigFile = options.addConfigFile
  const fullPath = path.resolve(filePath)
  try {
    const raw = fs.readFileSync(fullPath, 'utf8')
    const addFile = addConfigFile ? addConfigFile.bind(null, path.dirname(fullPath)) : null
    options.addConfigFile = addFile
    options.file = fullPath
    return parseTOMLContent(raw, options)
  } catch (ex) {
    throw new Error(`Failed to parse TOML file ${fullPath}: ${ex.message}, ${ex.stack}`)
  }
}

function parseTOMLContent (raw, options = {}) {
  const apiVersion = options.apiVersion || '1.7'
  const addConfigFile = options.addConfigFile
  let config
  if (tokenizer.hasTokens(raw)) {
    config = toml.parse(_.template(raw)(options.data))
  } else {
    config = toml.parse(raw)
  }
  config.apiVersion = apiVersion
  if (addConfigFile) {
    config.addConfigFile = addConfigFile
  }
  config.deployment = config.deployment || {}
  config.service = config.service || {}
  config.deployment = Object.assign({}, DEPLOYMENT_DEFAULTS, config.deployment)
  return omitEmptyKeys(buildService(config))
}

function omitEmptyKeys (obj) {
  const keys = Object.keys(obj)
  keys.forEach(k => {
    const val = obj[k]
    if (val === null || val === undefined || val === {} || val === []) {
      delete obj[k]
    } else if (typeof val === 'object') {
      omitEmptyKeys(val)
    }
  })
  return obj
}

module.exports = {
  buildService: buildService,
  parseTOMLFile: parseTOMLFile,
  parseTOMLContent: parseTOMLContent
}
