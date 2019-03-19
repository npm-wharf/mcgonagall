const Joi = require('joi')

const CPU_SCALE_REGEX = /^(\s*[<>]\s*[.0-9]+([ ]?Mi|[ ]?Gi|%)?)+$/
const PROBE_REGEX = /^(port[:][0-9a-zA-Z]+|[:][0-9a-zA-Z]+([/a-zA-Z0-9_\-?=&]+)?|((?!port[:])[/a-zA-Z][^,]+\s*)+)(([,]([a-zA-Z]+[=][0-9]+))+)?$/
const RAM_SCALE_REGEX = /^(\s*[<>]\s*[.0-9]+([ ]?Ki|[ ]?Mi|[ ]?Gi))+$/
const STORAGE_SPEC_REGEX = /^[0-9]+Gi[:](exclusive|shared)$/
const VOLUME_MAP_REGEX = /^([a-zA-Z0-9_\-/]+|[a-z-]+[::]((\S)+([=]\S+)?[,]?)+)$/
const POD_SELECTOR_REGEX = /((([a-zA-Z0-9_-]+)[:]([^;]+))[;]?)*/
const POLICY_PORT_REGEX = /^[0-9]{2,6}([.](tcp|udp))?$/
const POLICY_SOURCE_REGEX = /((([0-9]{1,3}[./]?){5})(([ ]?[!][ ]?(([0-9]{1,3}[./]?){5}))*)|(namespace|pod)[ ]?[=][ ]?((([a-zA-Z0-9_-]+)[:]([^;]+))[;]?)+)/

function checkCPUScale (expression) {
  return CPU_SCALE_REGEX.test(expression)
}

function checkEgressBlock (expression) {
  return POLICY_SOURCE_REGEX.test(expression)
}

function checkIngressBlock (expression) {
  return POLICY_SOURCE_REGEX.test(expression)
}

function checkPolicyPort (expression) {
  return POLICY_PORT_REGEX.test(expression)
}

function checkPodSelector (expression) {
  return POD_SELECTOR_REGEX.test(expression)
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
  image: Joi.any()
    .when('security', {
      is: Joi.exist(),
      then: Joi.string(),
      otherwise: Joi.when('network', {
        is: Joi.exist(),
        then: Joi.string(),
        otherwise: Joi.string().required()
      })
    }),
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
    Joi.string().uri({ allowRelative: true })
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
  },
  security: Joi.object({
    account: Joi.string(),
    role: Joi.string(),
    context: Joi.string(),
    capabilities: Joi.array().items(Joi.string()),
    escalation: Joi.boolean(),
    rules: Joi.array().items(
      Joi.object({
        groups: Joi.array(),
        resources: Joi.array(),
        resourceNames: Joi.array(),
        verbs: Joi.array()
      })
    )
  }),
  network: Joi.object({
    selector: Joi.string().empty('').regex(POD_SELECTOR_REGEX, 'pod selector'),
    ingress: Joi.array().items(
      Joi.object({
        from: Joi.array().items(Joi.string().regex(POLICY_SOURCE_REGEX)),
        ports: Joi.array().items(Joi.string().regex(POLICY_PORT_REGEX))
      })
    ),
    egress: Joi.array().items(
      Joi.object({
        to: Joi.array().items(Joi.string().regex(POLICY_SOURCE_REGEX)),
        ports: Joi.array().items(Joi.string().regex(POLICY_PORT_REGEX))
      })
    )
  })
}

const serviceSchema = Joi.compile(serviceDefinition)

function validateConfig (config) {
  return Joi.validate(config, serviceSchema, {
    allowUnknown: true
  })
}

module.exports = {
  checkCPUScale,
  checkEgressBlock,
  checkIngressBlock,
  checkPolicyPort,
  checkPodSelector,
  checkProbe,
  checkRAMScale,
  checkStorageSpec,
  checkVolumeMap,
  validateConfig
}
