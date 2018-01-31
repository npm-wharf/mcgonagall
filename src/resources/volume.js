const expressionParser = require('../expressionParser')

function createVolumes (config) {
  if (config.volumes) {
    const volumeKeys = Object.keys(config.volumes)
    return volumeKeys.reduce((acc, key) => {
      const volumeMap = expressionParser.parseVolume(key, config.volumes[key])
      if (volumeMap.configMap && config.addConfigFile) {
        volumeMap.configMap.items.forEach(item => {
          config.addConfigFile(
            [config.namespace, volumeMap.configMap.name].join('.'),
            item.path,
            item.key
          )
        })
      }
      acc.push(volumeMap)
      return acc
    }, [])
  } else {
    return undefined
  }
}

module.exports = {
  createVolumes: createVolumes
}
