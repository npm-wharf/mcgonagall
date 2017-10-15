const fs = require('fs')
const path = require('path')
const expressionParser = require('./expressionParser')
const toml = require('toml-j0.4')
const validation = require('./validation')

/** `Object#toString` result references. */
const BOOL_TAG = '[object Boolean]'
const DATE_TAG = '[object Date]'
const NUMBER_TAG = '[object Number]'
const STRING_TAG = '[object String]'
const NOT_AN_OBJECT = ''

const API_VERSION_MAP = require('./apiVersionMap')

function buildService (config) {
  const result = validation.validateConfig(config)
  if (result.error) {
    return result
  }
  const [name,namespace] = config.name.split('.')
  config.name = name
  config.namespace = namespace

  const definition = {
    fqn: [name,namespace].join('.'),
    name: name,
    namespace: namespace
  }

  if (config.ports) {
    const service = getService(config)
    Object.assign(definition, service)
  }

  if (config.stateful) {
    const set = getStatefulSet(config)
    Object.assign(definition, set)
  } else if (config.daemon) {
    const daemon = getDaemon(config)
    Object.assign(definition, daemon)
  } else {
    const deployment = getDeployment(config)
    Object.assign(definition, deployment)
  }

  if (config.subdomain && !config.daemon) {
    const nginx = buildNginxBlock(config)
    Object.assign(definition, nginx)
  }

  if (config.security) {
    const account = getAccount(config)
    const roleBinding = getRoleBinding(config)
    Object.assign(definition, account)
    Object.assign(definition, roleBinding)
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
      ssl_certificate       "/etc/nginx/cert.pem";
      ssl_certificate_key   "/etc/nginx/cert.pem";

      ssl_session_cache shared:SSL:1m;
      ssl_session_timeout 10m;
      ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
      ssl_ciphers HIGH:SEED:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!RSAPSK:!aDH:!aECDH:!EDH-DSS-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA:!SRP;
      ssl_prefer_server_ciphers on;

      server_name   ~^${config.subdomain}[.].*$;

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
  let env = []
  let ports = []

  if (config.scale.ram) {
    expressionParser.addResource(resources, 'ram', config.scale.ram)
  }
  if (config.scale.cpu) {
    expressionParser.addResource(resources, 'cpu', config.scale.cpu)
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
    image: config.image,
    env: env,
    ports: ports
  }
  Object.assign(container, resources)

  if (config.command) {
    command = expressionParser.parseCommand(config.command)
    Object.assign(container, command)
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
        replicas: config.scale.containers,
        revisionHistoryLimit: config.historyLimit || 1,
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
        replicas: config.scale.containers,
        revisionHistoryLimit: config.historyLimit || 1,
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
  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.deployment.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.deployment.metadata, metadata || {})
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
          name: config.security.account,
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
      name: config.serviceAlias || config.name,
      labels: {
        app: config.serviceAlias || config.name
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

  if (config.serviceLabels) {
    const metadata = expressionParser.parseMetadata(config.serviceLabels)
    Object.assign(service.metadata.labels, metadata)
  }

  const ports = expressionParser.parsePorts(config.ports, true)
  service.spec.ports = ports

  if (config.stateful) {
    if (config.serviceAlias && config.serviceAlias !== config.name) {
      statefulService = clone(service)
      statefulService.spec.clusterIP = 'None'
      service.metadata.name = config.name
      service.metadata.labels.app = config.name
      definition.services.push(statefulService)
    } else {
      service.spec.clusterIP = 'None'
    }
  }

  if (config.loadbalance) {
    service.spec.type = 'LoadBalancer'
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
        serviceName: config.serviceAlias,
        replicas: config.scale.containers,
        revisionHistoryLimit: config.historyLimit || 1,
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

function parse(toml) {
  const config = toml.parse(raw)
}

function parseTOMLFile (apiVersion, filePath, addConfigFile) {
  const fullPath = path.resolve(filePath)
  try {
    const raw = fs.readFileSync(fullPath, 'utf8')
    const addFile = addConfigFile ? addConfigFile.bind(null, path.dirname(fullPath)) : null
    return parseTOMLContent(apiVersion, raw, addFile)
  } catch (ex) {
    throw new Error(`Failed to parse TOML file ${fullPath}: ${ex.message}, ${ex.stack}`)
  }
}

function parseTOMLContent (apiVersion, raw, addConfigFile) {
  const config = toml.parse(raw)
  config.apiVersion = apiVersion
  if (addConfigFile) {
    config.addConfigFile = addConfigFile
  }
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
