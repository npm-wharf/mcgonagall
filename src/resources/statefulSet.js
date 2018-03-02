const { getApiVersion } = require('../apiVersionMap')
const { createContainer } = require('./container')
const expressionParser = require('../expressionParser')
const { createVolumes } = require('./volume')
const { createVolumeClaims } = require('./volumeClaim')

function createStatefulSet (config) {
  const container = createContainer(config)
  const volumes = createVolumes(config)
  const volumeClaims = createVolumeClaims(config)
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  const definition = {
    statefulSet: {
      apiVersion: getApiVersion(config, 'statefulSet'),
      kind: 'StatefulSet',
      metadata: {
        namespace: config.namespace,
        name: config.name,
        labels: {
          name: config.name,
          namespace: config.namespace
        }
      },
      spec: {
        serviceName: config.service.alias,
        replicas: config.scale ? config.scale.containers : 1,
        revisionHistoryLimit: config.deployment.history || 1,
        updateStrategy: {
          type: 'RollingUpdate'
        },
        selector: {
          matchLabels: {
            app: config.name
          }
        },
        template: {
          metadata: {
            labels: {
              app: config.name,
              name: config.name,
              namespace: config.namespace
            }
          },
          spec: {
            containers: [ container ],
            volumes: volumes
          }
        },
        volumeClaimTemplates: volumeClaims
      }
    }
  }

  if (config.deployment.deadline) {
    definition.statefulSet.spec.progressDeadlineSeconds = config.deployment.deadline
  }
  if (config.deployment.ready) {
    definition.statefulSet.spec.minReadySeconds = config.deployment.ready
  }
  if (config.security && config.security.account) {
    definition.statefulSet.spec.template.spec.serviceAccount = config.security.account
    definition.statefulSet.spec.template.spec.serviceAccountName = config.security.account
  }

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.statefulSet.metadata.labels, labels)
    Object.assign(definition.statefulSet.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.statefulSet.metadata, metadata || {})
  return definition
}

module.exports = {
  createStatefulSet: createStatefulSet
}
