const expressionParser = require('../expressionParser')

function createVolumeClaims (config) {
  if (config.storage) {
    const storageKeys = Object.keys(config.storage)
    return storageKeys.reduce((acc, key) => {
      acc.push(expressionParser.parseStore(key, config.storage[key], config.namespace))
      return acc
    }, [])
  } else {
    return undefined
  }
}

module.exports = {
  createVolumeClaims: createVolumeClaims
}
