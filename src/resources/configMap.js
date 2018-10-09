const { getApiVersion } = require('../apiVersionMap')

function createConfig (config, namespace, name, data) {
  const definition = {
    apiVersion: getApiVersion(config, 'config'),
    kind: 'ConfigMap',
    metadata: {
      name: name,
      namespace: namespace,
      labels: {
        name: name,
        namespace: namespace
      }
    },
    data: data
  }
  return definition
}

module.exports = {
  createConfig: createConfig
}
