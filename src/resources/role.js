const { getApiVersion } = require('../apiVersionMap')

function createRole (config) {
  const cluster = /^ClusterRole/.test(config.security.role)
  const roleName = config.security.role.split(';')[1]
  const rules = config.security.rules
  let ruleSet = []

  if (rules) {
    ruleSet = rules.map(rule => {
      if (rule.groups) {
        rule.apiGroups = rule.groups
        delete rule.groups
      } else {
        rule.apiGroups = ['']
      }
      return rule
    })
  }

  const definition = {
    role: {
      kind: cluster ? 'ClusterRole' : 'Role',
      apiVersion: getApiVersion(config, 'role'),
      metadata: {
        name: roleName
      },
      rules: ruleSet.length ? ruleSet : undefined
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
