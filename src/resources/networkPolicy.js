const { getApiVersion } = require('../apiVersionMap')
const expressionParser = require('../expressionParser')

function createNetworkPolicy (config) {
  const selector = config.network.selector
    ? { matchLabels: expressionParser.parsePodSelector(config.network.selector) }
    : {}
  const types = []
  let ingress
  let egress
  if (config.network.ingress) {
    types.push('Ingress')
    ingress = config.network.ingress.reduce((list, ingress) => {
      let froms, ports
      const block = {}
      if (ingress.from) {
        froms = ingress.from.map(i =>
          expressionParser.parseNetworkSource(i)
        )
        block.from = froms
      }
      if (ingress.ports) {
        ports = ingress.ports.map(p =>
          expressionParser.parsePolicyPort(p)
        )
        block.ports = ports
      }
      if (Object.keys(block).length > 0) {
        if (block.from.length === 0) {
          delete block.from
        }
        list.push(block)
      }
      return list
    }, [])
  }
  if (config.network.egress) {
    types.push('Egress')
    egress = config.network.egress.reduce((list, egress) => {
      let tos, ports
      const block = {}
      if (egress.to) {
        tos = egress.to.map(i =>
          expressionParser.parseNetworkSource(i)
        )
        block.to = tos
      }
      if (egress.ports) {
        ports = egress.ports.map(p =>
          expressionParser.parsePolicyPort(p)
        )
        block.ports = ports
      }
      if (Object.keys(block).length > 0) {
        if (block.to.length === 0) {
          delete block.to
        }
        list.push(block)
      }
      return list
    }, [])
  }
  const definition = {
    networkPolicy: {
      apiVersion: getApiVersion(config, 'networkPolicy'),
      kind: 'NetworkPolicy',
      metadata: {
        namespace: config.namespace,
        name: config.name,
        labels: {
          name: config.name,
          namespace: config.namespace
        }
      },
      spec: {
        podSelector: selector,
        policyTypes: types
      }
    }
  }

  if (ingress && ingress.length > 0) {
    definition.networkPolicy.spec.ingress = ingress
  }
  if (egress && egress.length > 0) {
    definition.networkPolicy.spec.egress = egress
  }

  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  Object.assign(definition.networkPolicy.metadata, metadata || {})

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.networkPolicy.metadata.labels, labels)
  }

  return definition
}

module.exports = {
  createNetworkPolicy: createNetworkPolicy
}
