const fs = require('fs')
const path = require('path')
const expressionParser = require('./expressionParser')
const validation = require('./validation')
const tokenizer = require('./tokenizer')
const { createAccount } = require('./resources/account')
const { buildNginxBlock } = require('./resources/nginxBlock')
const { createCronJob } = require('./resources/cronJob')
const { createDaemonSet } = require('./resources/daemonSet')
const { createDeployment } = require('./resources/deployment')
const { createJob } = require('./resources/job')
const { createNetworkPolicy } = require('./resources/networkPolicy')
const { createRole } = require('./resources/role')
const { createRoleBinding } = require('./resources/roleBinding')
const { createService } = require('./resources/service')
const { createStatefulSet } = require('./resources/statefulSet')

function buildResources (config) {
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
    const service = createService(config)
    Object.assign(definition, service)
  }

  if (config.job) {
    let job = config.deployment.schedule
      ? createCronJob(config) : createJob(config)
    Object.assign(definition, job)
  } else if (config.stateful) {
    const set = createStatefulSet(config)
    Object.assign(definition, set)
  } else if (config.daemon) {
    const daemon = createDaemonSet(config)
    Object.assign(definition, daemon)
  } else if (config.image) {
    const deployment = createDeployment(config)
    Object.assign(definition, deployment)
  }

  if (config.service.subdomain && !config.daemon) {
    const nginx = buildNginxBlock(config)
    Object.assign(definition, nginx)
  }

  if (config.security) {
    if (config.security.account) {
      const account = createAccount(config)
      Object.assign(definition, account)
    }
    if (config.security.role) {
      const role = createRole(config)
      const roleBinding = createRoleBinding(config)
      Object.assign(definition, role)
      Object.assign(definition, roleBinding)
    }
  }

  if (config.network) {
    const policy = createNetworkPolicy(config)
    Object.assign(definition, policy)
  }

  return omitEmptyKeys(definition)
}

function getVolumeTokens (basePath, config) {
  if (config.volumes) {
    const volumeKeys = Object.keys(config.volumes)
    return volumeKeys.reduce((acc, key) => {
      const volumeMap = expressionParser.parseVolume(key, config.volumes[key])
      if (volumeMap.configMap) {
        volumeMap.configMap.items.forEach(item => {
          const filePath = path.join(basePath, item.key)
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8')
            acc = acc.concat(tokenizer.getTokens(content))
          }
        })
      }
      return acc
    }, [])
  } else {
    return []
  }
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
  buildResources: buildResources,
  getVolumeTokens: getVolumeTokens
}
