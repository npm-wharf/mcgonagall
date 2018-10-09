const { getApiVersion } = require('../apiVersionMap')
const { createContainer } = require('./container')
const expressionParser = require('../expressionParser')
const { createVolumes } = require('./volume')
const { createVolumeClaims } = require('./volumeClaim')

function createCronJob (cluster, config) {
  const container = createContainer(cluster, config)
  const volumes = createVolumes(config)
  const volumeClaims = createVolumeClaims(config)
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  let concurrency
  if (config.scale && config.scale.containers) {
    concurrency = 'Allow'
  } else if (config.completions === 1) {
    concurrency = 'Forbid'
  } else {
    concurrency = 'Replace'
  }
  const definition = {
    cronJob: {
      apiVersion: getApiVersion(config, 'cronjob'),
      kind: 'CronJob',
      metadata: {
        namespace: config.namespace,
        name: config.name,
        labels: {
          name: config.name,
          namespace: config.namespace
        }
      },
      spec: {
        schedule: config.deployment.schedule,
        jobTemplate: {
          spec: {
            successfulJobsHistoryLimit: config.deployment.history || 1,
            failedJobsHistoryLimit: config.deployment.history || 1,
            concurrencyPolicy: concurrency,
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
                restartPolicy: config.deployment.restart || 'Never',
                backoffLimit: config.deployment.backoff || 6,
                volumes: volumes
              }
            },
            volumeClaimTemplates: volumeClaims
          }
        }
      }
    }
  }
  if (config.deployment.timeLimit) {
    definition.cronJob.spec.jobTemplate.spec.startingDeadlineSeconds = config.deployment.timeLimit
  }
  if (config.security && config.security.account) {
    definition.cronJob.spec.jobTemplate.spec.template.spec.serviceAccount = config.security.account
    definition.cronJob.spec.jobTemplate.spec.template.spec.serviceAccountName = config.security.account
  }
  if (config.imagePullSecret) {
    definition.cronJob.spec.jobTemplate.template.spec.imagePullSecrets = [
      {
        name: config.imagePullSecret
      }
    ]
  }

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.cronJob.metadata.labels, labels)
    Object.assign(definition.cronJob.spec.jobTemplate.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.cronJob.metadata, metadata || {})
  return definition
}

module.exports = {
  createCronJob: createCronJob
}
