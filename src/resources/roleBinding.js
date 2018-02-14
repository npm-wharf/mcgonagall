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
  } else {
    const definition = {
      roleBinding: {
        apiVersion: getApiVersion(config, 'roleBinding'),
        kind: 'RoleBinding',
        metadata: {
          name: config.security.account,
          namespace: config.namespace
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
    return definition
  }
}

module.exports = {
  createRoleBinding: createRoleBinding
}
