const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const { parseTOMLFile, parseRawFile } = require('./parser')
const expressionParser = require('./expressionParser')
const { buildResources } = require('./resource')
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
    map = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: name,
        namespace: namespace
      },
      data: {}
    }
    cluster.configuration.push(map)
  }
  const fullPath = path.join(parentFilePath, filePath)
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
    return buildResources(config)
  } else if (/raw.ya?ml$/.test(file)) {
    const definition = parseRawFile(file, {
      data: options.data
    })
    return definition
  }
}

function getNginxServerConfig (cluster) {
  const serviceNames = Object.keys(cluster.services)
  return serviceNames.reduce((acc, serviceName) => {
    const service = cluster.services[serviceName]
    if (service.nginxBlock) {
      acc.push(service.nginxBlock
        .replace(/[\\]"/g, '"')
        .replace(/\\n/g, '\n'))
      delete service.nginxBlock
    }
    return acc
  }, []).join('\n\n')
}

function setScale (cluster, level, order, definition) {
  if (!level || !order) {
    return
  }
  const key = definition.name
  const service = cluster.services[key]
  const baseScale = definition.scale || {}
  const base = {
    containers: baseScale.containers || 1,
    ram: baseScale.ram,
    cpu: baseScale.cpu
  }
  const scales = order.reduce((acc, scale, index) => {
    let set = service[scale]
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
