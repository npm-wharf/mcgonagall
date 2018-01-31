const { getApiVersion } = require('../apiVersionMap')

function createRole (config) {
  const cluster = /^ClusterRole/.test(config.security.role)
  const roleName = config.security.role.split(';')[1]
  const rules = config.security.rules

  const definition = {
    role: {
      kind: cluster ? 'ClusterRole' : 'Role',
      apiVersion: getApiVersion(config, 'role'),
      metadata: {
        name: roleName
      },
      rules
    }
  }
  if (!cluster) {
    definition.role.metadata.namespace = config.namespace
  }
  return definition
}

module.exports = {
  createRole: createRole
}
