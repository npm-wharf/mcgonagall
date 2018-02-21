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
    ingress = config.network.ingress.map(ingress => {
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
      return block
    })
  }
  if (config.network.egress) {
    types.push('Egress')
    egress = config.network.egress.map(egress => {
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
      return block
    })
  }
  const definition = {
    networkPolicy: {
      apiVersion: getApiVersion(config, 'networkPolicy'),
      kind: 'NetworkPolicy',
      metadata: {
        namespace: config.namespace,
        name: config.name
      },
      spec: {
        podSelector: selector,
        policyTypes: types
      }
    }
  }

  if (ingress) {
    definition.networkPolicy.spec.ingress = ingress
  }
  if (egress) {
    definition.networkPolicy.spec.egress = egress
  }

  return definition
}

module.exports = {
  createNetworkPolicy: createNetworkPolicy
}
