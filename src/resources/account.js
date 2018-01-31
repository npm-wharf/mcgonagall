const { getApiVersion } = require('../apiVersionMap')

function createAccount (config) {
  return {
    account: {
      apiVersion: getApiVersion(config, 'account'),
      kind: 'ServiceAccount',
      metadata: {
        name: config.security.account,
        namespace: config.namespace
      }
    }
  }
}

module.exports = {
  createAccount: createAccount
}
