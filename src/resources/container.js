const expressionParser = require('../expressionParser')

function createContainer (cluster, config) {
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
    env = expressionParser.parseEnvironmentBlock(cluster, config.namespace, config.env)
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

  if (Object.keys(resources.resources).length > 0) {
    Object.assign(container, resources)
  }

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
    if (config.security.privileged) {
      security.securityContext.privileged = true
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

  if (config.deployment && config.deployment.pull) {
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

module.exports = {
  createContainer: createContainer
}
