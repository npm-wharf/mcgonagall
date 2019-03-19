const CONTAINER_REGEX = /([+*])\s*([0-9]+)/
const REQUIREMENT_REGEX = /[>]\s*([.0-9]+)\s*([a-zA-Z%]+)?/
const STORAGE_REGEX = /([a-zA-Z0-9]+)\s*[+]\s*([0-9]+)Gi/
const LIMIT_REGEX = /[<]\s*([.0-9]{1,6})\s*([a-zA-Z%]+)?/
const HTTP_PROBE_REGEX = /^[:]([0-9]{2,6}|[a-zA-Z0-9]+)([/a-zA-Z_\-0-9=?&]+)?/
const TCP_PROBE_REGEX = /^port[:]([0-9]{2,6}|[a-zA-Z0-9]+)/
const SERVICE_PORTS = /(([0-9]{2,6})<=)?(([0-9]{2,6})[.]?(tcp|udp)?)(=>([0-9]{2,6}))?$/

const POD_SELECTOR_REGEX = /((([a-zA-Z0-9_-]+)[:]([^;]+)))/g
const POLICY_PORT_REGEX = /^([0-9]{2,6})([.](tcp|udp))?$/
const POLICY_SOURCE_REGEX = /((([0-9]{1,3}[./]?){5})(([ ]?[!][ ]?(([0-9]{1,3}[./]?){5}))*)|(namespace|pod)[ ]?[=][ ]?(((([a-zA-Z0-9_-]+)[:]([^;]+))[;]?)+))/

const accessModes = {
  exclusive: 'ReadWriteOnce',
  shared: 'ReadWriteMany'
}

const probeArguments = {
  failure: 'failureThreshold',
  initial: 'initialDelaySeconds',
  period: 'periodSeconds',
  success: 'successThreshold',
  timeout: 'timeoutSeconds'
}

const resourceType = {
  ram: 'memory',
  cpu: 'cpu',
  storage: '',
  containers: ''
}

const unitConverters = {
  memory: {
    Gi: [ 1024, 'Mi' ],
    Mi: [ 1, 'Mi' ],
    Ki: [ 0.0009765625, 'Mi' ]
  },
  cpu: {
    '': [ 1000, 'm' ],
    '%': [ 10, 'm' ],
    'Mi': [ 1, 'm' ],
    'm': [ 1, 'm' ]
  }
}

const contextMap = {
  user: 'runAsUser',
  group: 'fsGroup'
}

const unitList = Object.keys(unitConverters)

function addResourceFromExpression (resources, expression) {
  const [resource, limits] = getResource(expression)
  addResource(resources, resource, limits)
}

function addResource (resources, resource, limits) {
  if (unitList.indexOf(resource) < 0) {
    resource = resourceType[resource]
  }
  const requirement = getResourceAmount(resource, REQUIREMENT_REGEX, limits)
  const limit = getResourceAmount(resource, LIMIT_REGEX, limits)
  if (requirement) {
    resources.resources.requests = resources.resources.requests || {}
    resources.resources.requests[resource] = requirement
  }
  if (limit) {
    resources.resources.limits = resources.resources.limits || {}
    resources.resources.limits[resource] = limit
  }
}

function hasConfiguration (cluster, namespace, map, block) {
  var configMap
  var hasKeys = false
  let i = 0
  while (!configMap && i < cluster.configuration.length) {
    const m = cluster.configuration[i]
    if (m.metadata.namespace === namespace && m.metadata.name === map) {
      configMap = m
      break
    }
    i++
  }
  if (configMap) {
    hasKeys = Object.values(block).reduce((acc, key) => {
      acc = acc && configMap.data[key] !== undefined
      return acc
    }, true)
  }
  return hasKeys
}

function hasSecret (cluster, namespace, secretName, block) {
  var secret
  var hasKeys = false
  let i = 0
  while (!secret && i < cluster.secrets.length) {
    const m = cluster.secrets[i]
    if (m.metadata.namespace === namespace && m.metadata.name === secretName) {
      secret = m
      break
    }
    i++
  }
  if (secret) {
    hasKeys = Object.values(block).reduce((acc, key) => {
      acc = acc && secret.data[key] !== undefined
      return acc
    }, true)
  }
  return hasKeys
}

function getResource (set) {
  const resource = /[a-z]+/.exec(set)[0]
  return [resourceType[resource], set.replace(resource, '')]
}

function getResourceAmount (resource, regex, set) {
  const match = regex.exec(set)
  if (match) {
    const originalAmount = parseFloat(match[1])
    const originalUnits = match[2] || ''
    const [ multiplier, units ] = unitConverters[ resource ][ originalUnits ]
    const value = multiplier * originalAmount
    return units ? [ value, units ].join('') : value
  } else {
    return undefined
  }
}

function parseArgs (expression) {
  return { args: Array.isArray(expression) ? expression : expression.split(' ') }
}

function parseCLIProbe (expression) {
  const list = expression.split(',')
  const probe = {
    exec: {
      command: list[0].split(' ')
    }
  }
  list
    .slice(1)
    .map(assignment => {
      const [abbrev, value] = assignment.split('=')
      const setting = probeArguments[abbrev]
      probe[setting] = parseInt(value)
    })
  return probe
}

function parseCommand (expression) {
  if (Array.isArray(expression)) {
    return { command: expression }
  } else if (/\n/.test(expression)) {
    return { command: [ expression.replace(/\t/g, '  ') ] }
  } else {
    return { command: expression.split(' ') }
  }
}

function parseConfigBlock (name, block) {
  const keys = Object.keys(block)
  return keys.reduce((acc, key) => {
    acc.push({
      name: key,
      valueFrom: {
        configMapKeyRef: {
          name: name,
          key: block[key]
        }
      }
    })
    return acc
  }, [])
}

function parseContainer (expression) {
  const [, op, value] = CONTAINER_REGEX.exec(expression) // eslint-disable-line no-unused-vars
  return { containers: [ op, value ] }
}

function parseContainerPort (name, expression) {
  const [ , , target, , container, protocol, , ] = SERVICE_PORTS.exec(expression)
  return {
    name: name,
    containerPort: parseInt(target || container),
    protocol: (protocol || 'tcp').toUpperCase()
  }
}

function parseContext (expression) {
  const sets = expression.split(';')
  return sets.reduce((acc, set) => {
    if (set) {
      const [name, val] = set.split('=')
      acc[contextMap[name.trim()]] = parseInt(val.trim())
    }
    return acc
  }, {})
}

function parseCPU (expression, factors = { resources: {} }) {
  addResourceFromExpression(factors, expression)
  return factors
}

function parseEnvironmentBlock (cluster, namespace, block) {
  const keys = Object.keys(block)
  return keys.reduce((acc, key) => {
    const val = block[key]
    if (typeof val === 'object') {
      if (hasConfiguration(cluster, namespace, key, val)) {
        acc = acc.concat(parseConfigBlock(key, val))
      } else if (hasSecret(cluster, namespace, key, val)) {
        acc = acc.concat(parseSecretBlock(key, val))
      } else {
        acc = acc.concat(parseFieldRefBlock(key, val))
      }
    } else {
      acc.push({
        name: key,
        value: val
      })
    }
    return acc
  }, [])
}

function parseFieldRefBlock (name, block) {
  const keys = Object.keys(block)
  return keys.reduce((acc, key) => {
    acc.push({
      name: key,
      valueFrom: {
        fieldRef: {
          fieldPath: block[key]
        }
      }
    })
    return acc
  }, [])
}

function parseHTTPProbe (expression) {
  const match = HTTP_PROBE_REGEX.exec(expression)
  const port = /^[0-9]+$/.test(match[1]) ? parseInt(match[1]) : match[1]
  const url = match[2] || '/'
  const probe = {
    httpGet: {
      path: url,
      port: port
    }
  }
  expression
    .split(',')
    .slice(1)
    .map(assignment => {
      const [abbrev, value] = assignment.split('=')
      const setting = probeArguments[abbrev]
      probe[setting] = parseInt(value)
    })
  return probe
}

function parseImage (image) {
  let parts = image.split('/')
  return [
    parts.slice(0, -2).join('/') || 'hub.docker.com',
    parts.slice(-2, -1)[0] || 'official',
    parts.slice(-1)[0]
  ]
}

function parseMetadata (expression) {
  const sets = expression.split(';')
  return sets.reduce((acc, set) => {
    if (set) {
      const [name, val] = set.split('=')
      acc[name.trim()] = val.trim()
    }
    return acc
  }, {})
}

function parseNetworkSource (expression) {
  const match = POLICY_SOURCE_REGEX.exec(expression)
  if (match) {
    const [,,
      acceptRange,,
      fullExclude,,
      lastExclude,,
      type,
      fullSelector,
      lastSelector,,
      label,
      value
    ] = match
    if (acceptRange) {
      const block = {
        ipBlock: {
          cidr: acceptRange
        }
      }
      if (fullExclude) {
        block.ipBlock.except = []
        if (fullExclude.length < lastExclude.length - 3) {
          block.ipBlock.except.push(lastExclude)
        } else {
          fullExclude.replace(/[ ]/g, '').split('!').forEach(range => {
            if (range !== '') {
              block.ipBlock.except.push(range)
            }
          })
        }
      }
      return block
    } else if (type === 'namespace') {
      const block = {
        namespaceSelector: {
          matchLabels: {}
        }
      }
      if (fullSelector === lastSelector) {
        block.namespaceSelector.matchLabels[label] = value
      } else {
        block.namespaceSelector.matchLabels = parsePodSelector(fullSelector)
      }
      return block
    } else {
      const block = {
        podSelector: {
          matchLabels: {}
        }
      }
      if (fullSelector === lastSelector) {
        block.podSelector.matchLabels[label] = value
      } else {
        block.podSelector.matchLabels = parsePodSelector(fullSelector)
      }
      return block
    }
  }
}

function parsePodSelector (expression) {
  const selector = {}
  let match
  while ((match = POD_SELECTOR_REGEX.exec(expression))) {
    const [, , , key, val] = match
    selector[key] = val
  }
  return selector
}

function parsePolicyPort (expression) {
  const match = POLICY_PORT_REGEX.exec(expression)
  if (match) {
    const [, port,, type = 'tcp'] = match
    return {
      protocol: type.toUpperCase(),
      port: parseInt(port)
    }
  }
}

function parsePorts (ports, service = false) {
  const keys = Object.keys(ports)
  const portFn = service ? parseServicePort : parseContainerPort
  return keys.map(key => {
    return portFn(key, ports[key])
  })
}

function parseProbe (expression) {
  if (TCP_PROBE_REGEX.test(expression)) {
    return parseTCPProbe(expression)
  } else if (HTTP_PROBE_REGEX.test(expression)) {
    return parseHTTPProbe(expression)
  } else {
    return parseCLIProbe(expression)
  }
}

function parseRAM (expression, factors = { resources: {} }) {
  addResourceFromExpression(factors, expression)
  return factors
}

function parseScaleFactor (expression) {
  const factors = expression.split(';')
  return factors.reduce((acc, factor) => {
    if (/container/.test(factor)) {
      return Object.assign(acc, parseContainer(factor))
    } else if (/cpu/.test(factor)) {
      let limits = factor.replace(/^[ ]?cpu[ ]?/, '')
      return Object.assign(acc, { cpu: limits })
    } else if (/ram/.test(factor)) {
      let limits = factor.replace(/^[ ]?ram[ ]?/, '')
      return Object.assign(acc, { ram: limits })
    } else if (/storage/.test(factor)) {
      return Object.assign(acc, parseStorage(factor))
    }
  }, {})
}

function parseSecretBlock (name, block) {
  const keys = Object.keys(block)
  return keys.reduce((acc, key) => {
    acc.push({
      name: key,
      valueFrom: {
        secretKeyRef: {
          name: name,
          key: block[key]
        }
      }
    })
    return acc
  }, [])
}

function parseServicePort (name, expression) {
  const [, , target, , container, protocol, , node] = SERVICE_PORTS.exec(expression)
  const ports = {
    name: name,
    port: parseInt(container),
    targetPort: parseInt(target || container),
    protocol: (protocol || 'tcp').toUpperCase()
  }
  if (node) {
    ports.nodePort = parseInt(node)
  }
  return ports
}

function parseStore (name, expression, namespace) {
  const [size, access] = expression.split(':')
  return {
    metadata: {
      name: name,
      namespace: namespace
    },
    spec: {
      accessModes: [ accessModes[ access ] ],
      resources: {
        requests: { storage: size }
      }
    }
  }
}

function parseStorage (expression) {
  const storage = { storage: {} }
  const sets = expression.split('=')[1].split(',')
  sets.map(set => {
    const [_, mount, value] = STORAGE_REGEX.exec(set) // eslint-disable-line no-unused-vars
    storage.storage[mount] = value
  })
  return storage
}

function parseTCPProbe (expression) {
  const match = TCP_PROBE_REGEX.exec(expression)
  const port = /^[0-9]+$/.test(match[1]) ? parseInt(match[1]) : match[1]
  const probe = {
    tcpSocket: {
      port: port
    }
  }
  expression
    .split(',')
    .slice(1)
    .map(assignment => {
      const [abbrev, value] = assignment.split('=')
      const setting = probeArguments[abbrev]
      probe[setting] = parseInt(value)
    })
  return probe
}

function parseVolume (name, expression) {
  if (/::/.test(expression)) {
    const [mapName, mappings] = expression.split('::')
    if (mapName === 'secret') {
      const set = {
        name: name,
        secret: {
          secretName: mappings
        }
      }
      if (/:/.test(mappings)) {
        let octal
        [set.secret.secretName, octal] = mappings.split(':')
        set.secret.defaultMode = parseInt(octal, 8)
      }
      return set
    } else {
      let mode = 0
      const items = mappings.split(',').map(i => {
        const set = {
          key: i,
          path: i
        }
        if (/=/.test(i)) {
          [ set.key, set.path ] = i.split('=')
          if (/:/.test(set.path)) {
            let octal
            [set.path, octal] = set.path.split(':')
            set.mode = parseInt(octal, 8)
            if (set.mode > mode) {
              mode = set.mode
            }
          }
        } else if (/:/.test(set.key)) {
          let octal
          [set.key, octal] = set.key.split(':')
          set.path = set.key
          set.mode = parseInt(octal, 8)
          if (set.mode > mode) {
            mode = set.mode
          }
        }
        return set
      })
      const configMap = {
        name: name,
        configMap: {
          name: mapName,
          items: items
        }
      }
      if (mode !== 420 && mode > 0) {
        configMap.configMap.defaultMode = mode
      }
      return configMap
    }
  } else {
    return {
      name: name,
      hostPath: {
        path: expression,
        type: 'Directory'
      }
    }
  }
}

module.exports = {
  addResource: addResource,
  parseArgs: parseArgs,
  parseCommand: parseCommand,
  parseContainer: parseContainer,
  parseContext: parseContext,
  parseCPU: parseCPU,
  parseEnvironmentBlock: parseEnvironmentBlock,
  parseImage: parseImage,
  parseMetadata: parseMetadata,
  parseNetworkSource: parseNetworkSource,
  parsePodSelector: parsePodSelector,
  parsePorts: parsePorts,
  parsePolicyPort: parsePolicyPort,
  parseProbe: parseProbe,
  parseRAM: parseRAM,
  parseScaleFactor: parseScaleFactor,
  parseStore: parseStore,
  parseStorage: parseStorage,
  parseVolume: parseVolume
}
