const { getApiVersion } = require('../apiVersionMap')
const { createContainer } = require('./container')
const expressionParser = require('../expressionParser')
const { createVolumes } = require('./volume')
const { createVolumeClaims } = require('./volumeClaim')

function createDaemonSet (config) {
  const container = createContainer(config)
  const volumes = createVolumes(config)
  const volumeClaims = createVolumeClaims(config)
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  const definition = {
    daemonSet: {
      apiVersion: getApiVersion(config, 'daemonSet'),
      kind: 'DaemonSet',
      metadata: {
        namespace: config.namespace,
        name: config.name
      },
      spec: {
        replicas: config.scale ? config.scale.containers : 1,
        revisionHistoryLimit: config.deployment.history,
        selector: {
          matchLabels: {
            app: config.name
          }
        },
        template: {
          metadata: {
            labels: {
              app: config.name
            }
          },
          spec: {
            containers: [ container ],
            volumes: volumes
          },
          volumeClaimTemplates: volumeClaims
        }
      }
    }
  }

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.daemonSet.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.daemonSet.metadata, metadata || {})
  if (config.security && config.security.account) {
    definition.daemonSet.spec.template.spec.serviceAccount = config.security.account
    definition.daemonSet.spec.template.spec.serviceAccountName = config.security.account
  }
  return definition
}

module.exports = {
  createDaemonSet: createDaemonSet
}
