const { getApiVersion } = require('../apiVersionMap')

function createSecret (config, namespace, name, data, type = 'Opaque') {
  const definition = {
    apiVersion: getApiVersion(config, 'secret'),
    kind: 'Secret',
    metadata: {
      name: name,
      namespace: namespace,
      labels: {
        name: name,
        namespace: namespace
      }
    },
    type: type,
    data: data
  }
  return definition
}

module.exports = {
  createSecret: createSecret
}
