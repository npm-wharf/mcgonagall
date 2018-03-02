const expressionParser = require('../expressionParser')
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
        name: roleName,
        labels: {
          name: roleName
        }
      },
      rules: ruleSet.length ? ruleSet : undefined
    }
  }
  if (!cluster) {
    definition.role.metadata.namespace = config.namespace
    definition.role.metadata.labels.namespace = config.namespace
  }
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  Object.assign(definition.role.metadata, metadata || {})

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.role.metadata.labels, labels)
  }
  return definition
}

module.exports = {
  createRole: createRole
}
