const fs = require('fs')
const glob = require('globulesce')
const path = require('path')
const service = require('./serviceDefinition')
const tar = require('tar')
const toml = require('toml-j0.4')
const git = require('simple-git/promise')

const CLUSTER_FILE = 'cluster.toml'
const SERVER_DEFINITION_REGEX = /[$]SERVER_DEFINITIONS[$]/

function addConfigFile (cluster, parentFilePath, key, relativePath, filePath) {
  let map
  const [namespace, name] = key.split('.')
  cluster.configuration.forEach(m => {
    if (namespace === m.metadata.namespace &&
       name === m.metadata.name) {
      map = m
    }
  })
  if (!map) {
    map = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: name,
        namespace: namespace
      },
      data: {}
    }
    cluster.configuration.push(map)
  }
  const fullPath = path.resolve(parentFilePath, relativePath)
  map.data[relativePath] = fs.readFileSync(fullPath, 'utf8')
  if (relativePath === 'nginx.conf' && SERVER_DEFINITION_REGEX.test(map.data[relativePath])) {
    cluster.replaceNginxToken = function () {
      let content = getNginxServerConfig(cluster)
      map.data[relativePath] = map.data[relativePath]
        .replace(SERVER_DEFINITION_REGEX, content)
        .replace(/[\\]"/g, '"')
        .replace(/\\n/g, '\n')
      delete cluster.replaceNginxToken
    }
  }
}

function expandTarball (fullPath) {
  const extractTo = path.dirname(fullPath)
  return tar.x({
    file: fullPath,
    C: extractTo
  })
  .then(
    () => extractTo,
    err => {
      throw new Error(`Could not extract the tarball at '${fullPath}':\n\t${err.message}`)
    }
  )
}

function fetchGitRepo (fullPath, options) {
  const gitBasePath = path.resolve(
    options.gitBasePath || process.env.GIT_BASE_PATH || path.join(process.cwd(), 'git')
  )
  const gitPath = [gitBasePath].concat(fullPath.split('/').slice(-2)).join('/')
  if (!fs.existSync(gitBasePath)) {
    fs.mkdirSync(gitBasePath)
  }

  if (options.branch) {
    return git
      .clone(fullPath, gitPath)
      .checkout(options.branch)
      .then(
        () => gitPath,
        err => {
          throw new Error(`Could not clone git repository ${fullPath} and branch ${options.branch}:\n\t${err.message}`)
        }
      )
  } else {
    return git
      .clone(fullPath, gitPath)
      .then(
        () => gitPath,
        err => {
          throw new Error(`Could not clone git repository ${fullPath}:\n\t${err.message}`)
        }
      )
  }
}

function isGitUrl (fullPath) {
  // uh yeah ... this is probably too simple ...
  return /^git[:@]|^https?[:]/.test(fullPath)
}

function loadClusterFile (fullPath) {
  const clusterFile = path.join(fullPath, CLUSTER_FILE)
  try {
    const txt = fs.readFileSync(clusterFile, 'utf8')
    return toml.parse(txt)
  } catch (e) {
    throw new Error(`Could not load the cluster configuration file, '${clusterFile}' due to error: ${e.message}`)
  }
}

function getClusterConfig (fullPath, options) {
  let wait = Promise.resolve(fullPath)
  if (path.extname(fullPath) === '.tgz') {
    fullPath = path.dirname(fullPath)
    wait = expandTarball(fullPath)
  } else if (isGitUrl(fullPath)) {
    wait = fetchGitRepo(fullPath, options)
  }
  let clusterPath
  return wait
    .then(x => {
      clusterPath = x
      return loadClusterFile(clusterPath)
    })
    .then(config => {
      const cluster = processConfig(config, options)
      return processDefinitions(clusterPath, cluster)
        .then(services => {
          const keys = Object.keys(services)
          keys.forEach(key => {
            if (cluster.services[key]) {
              Object.assign(cluster.services[key], services[key])
            } else {
              cluster.services[key] = services[key]
            }
          })
          cluster.replaceNginxToken()
          return cluster
        })
    })
}

function getNginxServerConfig (cluster) {
  const serviceNames = Object.keys(cluster.services)
  return serviceNames.reduce((acc, serviceName) => {
    const service = cluster.services[serviceName]
    if (service.nginxBlock) {
      acc.push(service.nginxBlock
        .replace(/[\\]"/g, '"')
        .replace(/\\n/g, '\n'))
      delete service.nginxBlock
    }
    return acc
  }, []).join('\n\n')
}

function processConfig (config, options = {}) {
  const cluster = {
    namespaces: [],
    services: {},
    order: {},
    levels: new Set(),
    apiVersion: options.version || '1.7',
    configuration: []
  }

  const namespaces = Object.keys(config)
  namespaces.forEach(name => {
    if (name !== 'configuration') {
      let namespace = config[name]
      processNamespace(config, cluster, name, namespace)
    }
  })
  cluster.levels = Array.from(cluster.levels)
  cluster.levels.sort()
  cluster.configuration = processConfigMaps(config.configuration || {})
  return cluster
}

function processConfigMaps (config) {
  const mapNames = Object.keys(config)
  return mapNames.reduce((acc, key) => {
    acc.push(processConfigMap(config[key], key))
    return acc
  }, [])
}

function processConfigMap (data, key) {
  const [namespace, name] = key.split('.')
  return {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: name,
      namespace: namespace
    },
    data: data
  }
}

function processDefinitions (fullPath, cluster) {
  return glob(fullPath, ['**/*.toml'])
    .then(files => {
      return files.reduce((acc, file) => {
        if (!/cluster[.]toml/.test(file)) {
          const definition = service.parseTOMLFile(cluster.apiVersion, file, addConfigFile.bind(null, cluster))
          acc[definition.fqn] = definition
        }
        return acc
      }, {})
    })
}

function processNamespace (config, cluster, namespace, definition) {
  cluster.namespaces.push(namespace)
  const keys = Object.keys(definition)
  keys.forEach(serviceName => {
    let service = config[namespace][serviceName]
    service.name = serviceName
    service.namespace = namespace
    service.fqn = [serviceName, namespace].join('.')
    processService(cluster, serviceName, service)
  })
}

function processService (cluster, serviceName, service) {
  service.order = service.order || 0
  cluster.services[service.fqn] = service
  cluster.levels.add(service.order)
  if (!cluster.order[service.order]) {
    cluster.order[service.order] = []
  }
  cluster.order[service.order].push(service.fqn)
}

module.exports = {
  expandTarball: expandTarball,
  fetchGitRepo: fetchGitRepo,
  isGitUrl: isGitUrl,
  loadClusterFile: loadClusterFile,
  getClusterConfig: getClusterConfig,
  processConfig: processConfig,
  processDefinitions: processDefinitions,
  processNamespace: processNamespace,
  processService: processService
}
