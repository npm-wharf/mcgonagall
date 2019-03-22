const { getApiVersion } = require('../apiVersionMap')
const { createContainer } = require('./container')
const expressionParser = require('../expressionParser')
const { createAffinities } = require('./affinity')
const { createVolumes } = require('./volume')
const { createVolumeClaims } = require('./volumeClaim')

function createDeployment (cluster, config) {
  const container = createContainer(cluster, config)
  const volumes = createVolumes(config)
  const volumeClaims = createVolumeClaims(config)
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  const affinities = createAffinities(cluster, config)
  const definition = {
    deployment: {
      apiVersion: getApiVersion(config, 'deployment'),
      kind: 'Deployment',
      metadata: {
        namespace: config.namespace,
        name: config.name,
        labels: {
          name: config.name,
          namespace: config.namespace
        }
      },
      spec: {
        replicas: config.scale ? config.scale.containers : 1,
        revisionHistoryLimit: config.deployment.history,
        strategy: {
          rollingUpdate: {
            maxUnavailable: config.deployment.unavailable,
            maxSurge: config.deployment.surge
          }
        },
        selector: {
          matchLabels: {
            app: config.service.alias || config.name
          }
        },
        template: {
          metadata: {
            labels: {
              app: config.service.alias || config.name,
              name: config.name,
              namespace: config.namespace
            }
          },
          spec: {
            affinity: affinities,
            containers: [ container ],
            volumes: volumes
          }
        },
        volumeClaimTemplates: volumeClaims
      }
    }
  }

  if (config.deployment.deadline) {
    definition.deployment.spec.progressDeadlineSeconds = config.deployment.deadline
  }
  if (config.deployment.ready) {
    definition.deployment.spec.minReadySeconds = config.deployment.ready
  }
  if (config.security && config.security.account) {
    definition.deployment.spec.template.spec.serviceAccount = config.security.account
    definition.deployment.spec.template.spec.serviceAccountName = config.security.account
  }
  if (config.imagePullSecret) {
    definition.deployment.spec.template.spec.imagePullSecrets = [
      {
        name: config.imagePullSecret
      }
    ]
  }

  Object.keys(definition).forEach((key) => (definition[key] == null) && delete definition[key])

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.deployment.metadata.labels, labels)
    Object.assign(definition.deployment.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.deployment.metadata, metadata || {})
  return definition
}

module.exports = {
  createDeployment: createDeployment
}
