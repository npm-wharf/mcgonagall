const expressionParser = require('../expressionParser')
const { getApiVersion } = require('../apiVersionMap')

function createRoleBinding (config) {
  const roleParts = config.security.role.split(';')
  let clusterRole = false
  let role = ''
  if (roleParts.length > 1) {
    clusterRole = roleParts[0] === 'ClusterRole'
    role = roleParts[1]
  } else {
    role = roleParts[0]
  }
  let definition
  if (clusterRole) {
    definition = {
      roleBinding: {
        apiVersion: getApiVersion(config, 'roleBinding'),
        kind: 'ClusterRoleBinding',
        metadata: {
          name: config.security.account,
          labels: {
            name: config.security.account
          }
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
  } else {
    definition = {
      roleBinding: {
        apiVersion: getApiVersion(config, 'roleBinding'),
        kind: 'RoleBinding',
        metadata: {
          name: config.security.account,
          namespace: config.namespace,
          labels: {
            name: config.security.account,
            namespace: config.namespace
          }
        },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
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
  }

  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  Object.assign(definition.roleBinding.metadata, metadata || {})

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.roleBinding.metadata.labels, labels)
  }

  return definition
}

module.exports = {
  createRoleBinding: createRoleBinding
}
