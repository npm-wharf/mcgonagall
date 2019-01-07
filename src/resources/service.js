const _ = require('lodash')
const { getApiVersion } = require('../apiVersionMap')
const expressionParser = require('../expressionParser')

/** `Object#toString` result references. */
const BOOL_TAG = '[object Boolean]'
const DATE_TAG = '[object Date]'
const NUMBER_TAG = '[object Number]'
const STRING_TAG = '[object String]'
const NOT_AN_OBJECT = ''

function clone (source, target) {
  const tag = getObjectTag(source)
  if (source == null || typeof source !== 'object') {
    return source
  } else if (!isObject(source) && !Array.isArray(source)) {
    return source
  } else if (tag === BOOL_TAG || tag === STRING_TAG ||
            tag === NUMBER_TAG || tag === DATE_TAG) {
    return new source.constructor(source)
  }

  target = target || new source.constructor()
  for (var key in source) {
    target[ key ] = typeof target[ key ] === 'undefined' ? clone(source[ key ], null) : target[ key ]
  }
  return target
}

function getObjectTag (value) {
  if (!isObject(value)) {
    return NOT_AN_OBJECT
  }
  return Object.prototype.toString.call(value)
}

function isObject (value) {
  const type = typeof value
  return value != null && (type === 'object' || type === 'function')
}

function createService (config) {
  const definition = {
    services: []
  }

  const service = {
    apiVersion: getApiVersion(config, 'service'),
    kind: 'Service',
    metadata: {
      namespace: config.namespace,
      name: config.service.alias || config.name,
      labels: {
        app: config.service.alias || config.name,
        name: config.service.alias || config.name,
        namespace: config.namespace
      }
    },
    spec: {
      selector: {
        app: config.service.alias || config.name
      },
      ports: [
      ]
    }
  }

  if (config.service.labels) {
    const metadata = expressionParser.parseMetadata(config.service.labels)
    Object.assign(service.metadata.labels, metadata)
  }

  if (config.service.annotations) {
    const metadata = expressionParser.parseMetadata(config.service.annotations)
    service.metadata.annotations = metadata
  }

  const ports = expressionParser.parsePorts(config.ports, true)
  service.spec.ports = ports

  if (config.stateful) {
    if (config.service.alias && config.service.alias !== config.name) {
      const statefulService = clone(service)
      statefulService.spec.clusterIP = 'None'
      service.metadata.name = config.name
      service.metadata.labels.app = config.name
      service.metadata.labels.name = config.name
      definition.services.push(statefulService)
    } else {
      service.spec.clusterIP = 'None'
    }
  }

  if (_.some(service.spec.ports, port => port.nodePort)) {
    service.spec.type = 'NodePort'
  }

  if (config.service.loadbalance || config.service.loadBalance) {
    const policy = (config.service.loadbalance || config.service.loadBalance)
    service.spec.type = 'LoadBalancer'
    if (_.isString(policy)) {
      service.spec.externalTrafficPolicy = policy
    }
  }

  if (config.service.affinity) {
    service.spec.sessionAffinity = 'ClientIP'
  }

  if (config.service.externalName || config.service.externalname) {
    service.spec.type = 'ExternalName'
  }

  definition.services.push(service)

  return definition
}

module.exports = {
  createService: createService
}
