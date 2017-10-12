const Joi = require('joi')
const serviceDefinition = {
  name: Joi.string().required(),
  serviceAlias: Joi.string(),
  metadata: Joi.string(),
  stateful: Joi.boolean(),
  image: Joi.string().required(),
  command: Joi.string(),
  scale: {
    containers: Joi.number().integer().required(),
    ram: Joi.string().regex(/^(\s*[<>]\s*[.0-9]+([ ]?Ki|[ ]?Mi|[ ]?Gi))+$/, 'ram scale factors'),
    cpu: Joi.string().regex(/^(\s*[<>]\s*[.0-9]+([ ]?Mi|[ ]?Gi|%)?)+$/, 'cpu scale factors')
  },
  ports: Joi.object().pattern(
    /[0-9]+/,
    Joi.number().integer()
  ),
  mounts: Joi.object().pattern(
    /^.*$/,
    Joi.string().uri({allowRelative: true})
  ),
  volumes: {
    config: Joi.string().regex(/^[a-z\-]+[::]((\S)+([=]\S+)?[,]?)+$/, 'config map format')
  },
  storage: Joi.object().pattern(
    /^.*$/,
    Joi.string().regex(/^[0-9]+Gi[:](exclusive|shared)$/, 'storage spec')
  ),
  probes: {
    ready: Joi.string().regex(/^([:][0-9]+|(\w+\s*)+)([/a-zA-Z0-9_\-?=&]+)([,]([a-zA-Z]+[=][0-9]+))+$/, 'probe definition'),
    live: Joi.string().regex(/^([:][0-9]+|(\w+\s*)+)([/a-zA-Z0-9_\-?=&]+)([,]([a-zA-Z]+[=][0-9]+))+$/, 'probe definition')
  }
}

const serviceSchema = Joi.compile(serviceDefinition)

function validateConfig (config) {
  return Joi.validate(config, serviceSchema, {
    allowUnknown: true
  })
}

module.exports = {
  validateConfig: validateConfig
}
