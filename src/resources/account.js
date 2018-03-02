const expressionParser = require('../expressionParser')
const { getApiVersion } = require('../apiVersionMap')

function createAccount (config) {
  const definition = {
    account: {
      apiVersion: getApiVersion(config, 'account'),
      kind: 'ServiceAccount',
      metadata: {
        name: config.security.account,
        namespace: config.namespace,
        labels: {
          name: config.security.account,
          namespace: config.namespace
        }
      }
    }
  }

  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  Object.assign(definition.account.metadata, metadata || {})

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.account.metadata.labels, labels)
  }
  return definition
}

module.exports = {
  createAccount: createAccount
}
