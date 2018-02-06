const Joi = require('joi')

const CPU_SCALE_REGEX = /^(\s*[<>]\s*[.0-9]+([ ]?Mi|[ ]?Gi|%)?)+$/
const PROBE_REGEX = /^((port)[:][0-9a-zA-Z]+|[:][0-9a-zA-Z]+([/a-zA-Z0-9_\-?=&]+)?|([a-zA-Z0-9_\-/ ]+\s*)+)(([,]([a-zA-Z]+[=][0-9]+))+)?$/
const RAM_SCALE_REGEX = /^(\s*[<>]\s*[.0-9]+([ ]?Ki|[ ]?Mi|[ ]?Gi))+$/
const STORAGE_SPEC_REGEX = /^[0-9]+Gi[:](exclusive|shared)$/
const VOLUME_MAP_REGEX = /^([a-zA-Z0-9_\-/]+|[a-z-]+[::]((\S)+([=]\S+)?[,]?)+)$/

function checkCPUScale (expression) {
  return CPU_SCALE_REGEX.test(expression)
}

function checkProbe (expression) {
  return PROBE_REGEX.test(expression)
}

function checkRAMScale (expression) {
  return RAM_SCALE_REGEX.test(expression)
}

function checkStorageSpec (expression) {
  return STORAGE_SPEC_REGEX.test(expression)
}

function checkVolumeMap (expression) {
  return VOLUME_MAP_REGEX.test(expression)
}

const serviceDefinition = {
  name: Joi.string().required(),
  serviceAlias: Joi.string(),
  metadata: Joi.string(),
  stateful: Joi.boolean(),
  image: Joi.string().required(),
  command: Joi.alternatives().try([ Joi.string(), Joi.array().items(Joi.string()) ]),
  scale: {
    containers: Joi.number().integer(),
    ram: Joi.string().regex(RAM_SCALE_REGEX, 'ram scale factors'),
    cpu: Joi.string().regex(CPU_SCALE_REGEX, 'cpu scale factors')
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
    config: Joi.string().regex(VOLUME_MAP_REGEX, 'config map format')
  },
  storage: Joi.object().pattern(
    /^.*$/,
    Joi.string().regex(STORAGE_SPEC_REGEX, 'storage spec')
  ),
  probes: {
    ready: Joi.string().regex(PROBE_REGEX, 'probe definition'),
    live: Joi.string().regex(PROBE_REGEX, 'probe definition')
  }
}

const serviceSchema = Joi.compile(serviceDefinition)

function validateConfig (config) {
  return Joi.validate(config, serviceSchema, {
    allowUnknown: true
  })
}

module.exports = {
  checkCPUScale,
  checkProbe,
  checkRAMScale,
  checkStorageSpec,
  checkVolumeMap,
  validateConfig
}
