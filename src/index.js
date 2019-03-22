const path = require('path')
const yaml = require('js-yaml')
const outputWriter = require('./writers/file.js')
const cluster = require('./cluster')
const CLUSTER_FILE = 'cluster.json'

function transfigure (source, options = {}) {
  return cluster.getClusterConfig(source, options)
    .then(config => {
      if (options.output) {
        return write(options.output, config)
      } else {
        return config
      }
    })
}

function write (target, specification) {
  outputWriter.prepare(target)

  const { resources, configuration, secrets, imagePullSecrets, ...cluster } = specification
  writeCluster(target, cluster)
  writeYamlArray(target, configuration, 'config')
  writeYamlArray(target, secrets, 'secret')
  writeResources(target, resources)
}

function writeCluster (target, definition) {
  const fullPath = path.join(target, CLUSTER_FILE)
  const json = JSON.stringify(definition, null, 2) + '\n'
  outputWriter.write(fullPath, json)
}

function writeYamlArray (target, xs, namePrefix) {
  xs.forEach(x => writeCommon(target, x, x.metadata.namespace, namePrefix, x.metadata.name))
}

function writeCommon (target, definition, namespace, namePrefix, name) {
  const fullPath = path.join(target, namespace, namePrefix, `${name}.yml`)
  const yml = yaml.safeDump(definition)
  outputWriter.write(fullPath, yml)
}

function writeResources (target, xs) {
  for (const [_, x] of Object.entries(xs)) { // eslint-disable-line no-unused-vars
    if (x.hasOwnProperty('nginxBlock')) {
      writeNginx(target, x.namespace, x.name, x.nginxBlock)
    }

    // Filter to just k8s resources or arrays of k8s resources, then write them
    const resources = Object.entries(x).filter(
      // eslint-disable-next-line no-unused-vars
      ([_, v]) =>
        (v.hasOwnProperty('kind')) ||
        (Array.isArray(v) && v.every(y => y.hasOwnProperty('kind')))
    )

    for (const [type, resource] of resources) {
      // SHOULDDO: Change 'services' to 'service' in the constructed object to bypass the need for the type rename
      writeCommon(target, resource, x.namespace, x.name, type === 'services' ? 'service' : type)
    }
  }
}

function writeNginx (target, namespace, name, definition) {
  const fullPath = path.join(target, namespace, name, 'nginx.conf')
  outputWriter.write(fullPath, definition)
}

module.exports = {
  transfigure: transfigure
}
