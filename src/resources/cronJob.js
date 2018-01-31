const { getApiVersion } = require('../apiVersionMap')
const { createContainer } = require('./container')
const expressionParser = require('../expressionParser')
const { createVolumes } = require('./volume')
const { createVolumeClaims } = require('./volumeClaim')

function createCronJob (config) {
  const container = createContainer(config)
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
        name: config.name
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
    }
  }
  if (config.deployment.timeLimit) {
    definition.cronJob.spec.jobTemplate.spec.startingDeadlineSeconds = config.deployment.timeLimit
  }
  if (config.security && config.security.account) {
    definition.cronJob.spec.jobTemplate.spec.template.serviceAccountName = config.security.account
  }

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.cronJob.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.cronJob.metadata, metadata || {})
  return definition
}

module.exports = {
  createCronJob: createCronJob
}
