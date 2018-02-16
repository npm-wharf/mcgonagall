const { getApiVersion } = require('../apiVersionMap')
const { createContainer } = require('./container')
const expressionParser = require('../expressionParser')
const { createVolumes } = require('./volume')
const { createVolumeClaims } = require('./volumeClaim')

function createJob (config) {
  const container = createContainer(config)
  const volumes = createVolumes(config)
  const volumeClaims = createVolumeClaims(config)
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  const definition = {
    job: {
      apiVersion: getApiVersion(config, 'job'),
      kind: 'Job',
      metadata: {
        namespace: config.namespace,
        name: config.name
      },
      spec: {
        parallelism: config.scale ? config.scale.containers : 1,
        completions: config.deployment.completions || config.scale.containers,
        template: {
          metadata: {
            labels: {
              app: config.name
            }
          },
          spec: {
            containers: [ container ],
            restartPolicy: config.deployment.restart || 'Never',
            backoffLimit: config.deployment.backoff || 6,
            volumes: volumes
          }
        },
        volumeClaimTemplates: volumeClaims
      }
    }
  }

  if (config.deployment.timeLimit) {
    definition.job.spec.activeDeadlineSeconds = config.deployment.timeLimit
  }
  if (config.security && config.security.account) {
    definition.job.spec.template.spec.serviceAccount = config.security.account
    definition.job.spec.template.spec.serviceAccountName = config.security.account
  }

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.job.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.job.metadata, metadata || {})
  return definition
}

module.exports = {
  createJob: createJob
}
