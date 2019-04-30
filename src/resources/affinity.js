const R = require('ramda')

const topologies = new Map([
  ['host', 'kubernetes.io/hostname'],
  ['zone', 'failure-domain.beta.kubernetes.io/zone'],
  ['region', 'failure-domain.beta.kubernetes.io/region'],
  ['instance-type', 'beta.kubernetes.io/instance-type'],
  ['os', 'kubernetes.io/os'],
  ['arch', 'kubernetes.io/arch']
])
const affinityOperators = new Set(['In', 'NotIn', 'Exists', 'DoesNotExist', 'Gt', 'Lt'])

const validAffinityOperator = (x) => affinityOperators.has(x)
const anyInvalidOperators = R.compose(R.not, R.all(validAffinityOperator), R.keys)

const splitByNegative = R.partition(x => R.gte(x.weight, 0))
const splitByPreferred = R.partition(R.propEq('type', 'hard'))

const weightLens = R.lensProp('weight')
const negateWeight = R.map(R.over(weightLens, R.negate))
const removeWeight = R.map(R.omit(['weight']))

const mapKeyedObjectValues = R.pipe(R.mapObjIndexed, R.values)
const flatmapKeyedObjectValues = R.compose(R.flatten, mapKeyedObjectValues)

function sortMatchExpressions (xs) {
  if (anyInvalidOperators(xs)) {
    throw new Error(`Valid affinity matching operators are ${[...affinityOperators].join(', ')}, but found ${xs}`)
  }

  return flatmapKeyedObjectValues((x, operator) =>
    mapKeyedObjectValues((values, key) => (
      { key: key, operator: operator, values: [].concat(values) }
    ), x)
  , xs)
}

const parsePreferredAffinity = R.map(x => {
  return {
    weight: x.weight,
    podAffinityTerm: {
      labelSelector: {
        matchExpressions: R.chain(sortMatchExpressions)(x.match)
      },
      topologyKey: topologies.has(x.scope || null) ? topologies.get(x.scope) : topologies.get('host') // COULDDO: Support custom topologies here
    }
  }
})
const parseRequiredAffinity = R.compose(removeWeight, parsePreferredAffinity)

const createSelfResolver = (name) => R.lift(R.when(
  R.equals('self'), R.always({ name })
))

function createAffinities (cluster, config) {
  if (!config.hasOwnProperty('affinity')) {
    return null
  }

  const affinities = {}

  // Resolve `self` references before creating structures to avoid having to
  // pass config throughout every function
  const resolveSelfToName = createSelfResolver(config.name)
  const affinitySources = R.map(R.over(R.lensProp('match'), R.map(resolveSelfToName)))(config.affinity.pod)

  const [podAffinities, podAntiAffinities] = splitByNegative(affinitySources)
  if (podAffinities.length > 0) {
    const podAffinity = affinities.podAffinity = {}
    const [required, preferred] = splitByPreferred(podAffinities)
    if (required.length > 0) {
      podAffinity.requiredDuringSchedulingIgnoredDuringExecution = parseRequiredAffinity(required)
    }
    if (preferred.length > 0) {
      podAffinity.preferredDuringSchedulingIgnoredDuringExecution = parsePreferredAffinity(preferred)
    }
  }

  if (podAntiAffinities.length > 0) {
    const podAntiAffinity = affinities.podAntiAffinity = {}
    const [required, preferred] = R.compose(splitByPreferred, negateWeight)(podAntiAffinities)

    if (required.length > 0) {
      podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution = parseRequiredAffinity(required)
    }
    if (preferred.length > 0) {
      podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution = parsePreferredAffinity(preferred)
    }
  }
  return affinities
}

module.exports = {
  createAffinities: createAffinities
}
