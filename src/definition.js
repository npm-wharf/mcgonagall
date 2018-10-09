const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const { parseTOMLFile, parseRawFile } = require('./parser')
const expressionParser = require('./expressionParser')
const { buildResources } = require('./resource')
const { createConfig } = require('./resources/configMap')
const tokenizer = require('./tokenizer')

const SCALE_PROPS = ['containers', 'cpu', 'ram', 'storage']
const SERVER_DEFINITION_REGEX = /[$]SERVER_DEFINITIONS[$]/

function addConfigFile (cluster, options, parentFilePath, key, relativePath, filePath) {
  let map
  const [namespace, name] = key.split('.')
  cluster.configuration.forEach(m => {
    if (namespace === m.metadata.namespace &&
       name === m.metadata.name) {
      map = m
    }
  })
  if (!map) {
    map = createConfig(cluster, namespace, name, {})
    cluster.configuration.push(map)
  }
  const fullPath = path.join(parentFilePath, relativePath)
  let content = fs.readFileSync(fullPath, 'utf8')
  if (tokenizer.hasTokens(content)) {
    content = _.template(content)(options.data)
  }
  map.data[relativePath] = content
  if (relativePath === 'nginx.conf' && SERVER_DEFINITION_REGEX.test(map.data[relativePath])) {
    cluster.replaceNginxToken = function () {
      let content = getNginxServerConfig(cluster)
      map.data[relativePath] = map.data[relativePath]
        .replace(SERVER_DEFINITION_REGEX, content)
        .replace(/[\\]"/g, '"')
        .replace(/\\n/g, '\n')
      delete cluster.replaceNginxToken
    }
  }
}

function createFromFile (cluster, file, options) {
  if (!/(cluster[.]toml|raw.yml)/.test(file)) {
    const config = parseTOMLFile(file, {
      apiVersion: cluster.apiVersion,
      setScale: setScale.bind(null, cluster, options.scale, cluster.scaleOrder),
      addConfigFile: addConfigFile.bind(null, cluster, options, path.dirname(path.resolve(file))),
      data: options.data
    })
    return buildResources(cluster, config)
  } else if (/raw.ya?ml$/.test(file)) {
    const definition = parseRawFile(file, {
      data: options.data
    })
    return definition
  }
}

function getNginxServerConfig (cluster) {
  const resourceNames = Object.keys(cluster.resources)
  return resourceNames.reduce((acc, resourceName) => {
    const resource = cluster.resources[resourceName]
    if (resource.nginxBlock) {
      acc.push(resource.nginxBlock
        .replace(/[\\]"/g, '"')
        .replace(/\\n/g, '\n'))
      delete resource.nginxBlock
    }
    return acc
  }, []).join('\n\n')
}

function setScale (cluster, level, order, definition) {
  if (!level || !order) {
    return
  }
  const key = definition.name
  const resource = cluster.resources[key]
  const baseScale = definition.scale || {}
  const base = {
    containers: baseScale.containers || 1,
    ram: baseScale.ram,
    cpu: baseScale.cpu
  }
  const scales = order.reduce((acc, scale, index) => {
    let set = resource[scale]
    if (!set) {
      if (index === 0) {
        acc[scale] = base
      } else {
        acc[scale] = acc[order[index - 1]]
      }
    } else {
      let current = acc[scale] = expressionParser.parseScaleFactor(set)
      if (index > 0) {
        for (var i = index - 1; i >= 0; i--) {
          let previous = acc[order[i]]
          SCALE_PROPS.map(key => {
            current[key] = current[key] || previous[key]
          })
        }
      }
    }
    return acc
  }, {})
  const scale = scales[level]
  if (scale.storage) {
    _.each(scale.storage, (size, store) => {
      let parts = definition.storage[store].split(':')
      let original = parseInt(parts[0].replace(/[ ]?Gi$/, ''))
      definition.storage[store] = [`${parseInt(size) + original}Gi`].concat(parts.slice(1)).join(':')
    })
    delete scale.storage
  }
  if (scale.containers) {
    if (Array.isArray(scale.containers)) {
      let count = parseInt(definition.containers || 1)
      let factor = parseInt(scale.containers[1])
      switch (scale.containers[0]) {
        case '=':
          scale.containers = factor
          break
        case '+':
          scale.containers = count + factor
          break
        case '*':
          scale.containers = count * factor
          break
      }
    }
  }
  definition.scale = scale
}

module.exports = {
  createFromFile: createFromFile
}
