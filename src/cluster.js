const _ = require('lodash')
const fs = require('fs')
const glob = require('globulesce')
const path = require('path')
const service = require('./serviceDefinition')
const tar = require('tar')
const toml = require('toml-j0.4')
const git = require('simple-git/promise')
const tokenizer = require('./tokenizer')
const hasher = require('./hasher')

const CLUSTER_FILE = 'cluster.toml'
const GIT_URL_REGEX = /(https[:][/]{2}|git[:][/]{2}|git[@])([^/]+)(([/]|[:])([^/]+))([/]([^/:]+))([:]([a-z0-9_.-]+))?/i
const SERVER_DEFINITION_REGEX = /[$]SERVER_DEFINITIONS[$]/

_.templateSettings.imports.hash = hasher.hash

function addConfigFile (cluster, options, parentFilePath, key, relativePath, filePath) {
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
  let content = fs.readFileSync(fullPath, 'utf8')
  if (tokenizer.hasTokens(content)) {
    content = _.template(content)(options.data)
  }
  map.data[relativePath] = content
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
  const gitInfo = parseGitUrl(fullPath)
  const branch = gitInfo.tag || options.branch
  const gitPath = [gitBasePath].concat(gitInfo.owner, gitInfo.repo).join('/')
  if (!fs.existsSync(gitBasePath)) {
    fs.mkdirSync(gitBasePath)
  }

  if (fs.existsSync(gitPath)) {
    if (branch) {
      return git()
        .pull('origin', branch)
        .checkout(branch)
        .then(
          () => gitPath,
          err => {
            throw new Error(`Could not pull latest from git repository ${fullPath} and branch ${options.branch}:\n\t${err.message}`)
          }
        )
    } else {
      return git()
        .pull('origin', 'master')
        .then(
          () => gitPath,
          err => {
            throw new Error(`Could not pull latest from git repository ${fullPath}:\n\t${err.message}`)
          }
        )
    }
  } else {
    if (branch) {
      return git()
        .clone(fullPath, gitPath)
        .checkout(branch)
        .then(
          () => gitPath,
          err => {
            throw new Error(`Could not clone git repository ${fullPath} and branch ${options.branch}:\n\t${err.message}`)
          }
        )
    } else {
      return git()
        .clone(fullPath, gitPath)
        .then(
          () => gitPath,
          err => {
            throw new Error(`Could not clone git repository ${fullPath}:\n\t${err.message}`)
          }
        )
    }
  }
}

function isGitUrl (fullPath) {
  // uh yeah ... this is probably too simple ...
  return /^git[:@]|^https?[:]/.test(fullPath)
}

function loadClusterFile (options, fullPath) {
  const clusterFile = path.join(fullPath, CLUSTER_FILE)
  try {
    const txt = fs.readFileSync(clusterFile, 'utf8')
    if (tokenizer.hasTokens(txt)) {
      return toml.parse(_.template(txt)(options.data))
    } else {
      return toml.parse(txt)
    }
  } catch (e) {
    throw new Error(`Could not load the cluster configuration file, '${clusterFile}' due to error: ${e.message}`)
  }
}

function getClusterConfig (fullPath, options) {
  let wait = Promise.resolve(fullPath)
  if (/([.]tgz|[.]tar)/.test(path.extname(fullPath))) {
    wait = expandTarball(fullPath)
  } else if (isGitUrl(fullPath)) {
    wait = fetchGitRepo(fullPath, options)
  }
  return wait
    .then(x => {
      options.clusterPath = x
      return getTokenList(x)
    })
    .then(onTokens.bind(null, options))
    .then(loadClusterFile.bind(null, options))
    .then(onConfig.bind(null, options))
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

function getTokenList (fullPath) {
  return glob(fullPath, ['**/*.toml'])
    .then(files => {
      return _.uniq(_.flatten(
        files.map(file => {
          const content = fs.readFileSync(file, 'utf8')
          return tokenizer.getTokens(content)
        })))
    })
}

function onConfig (options, config) {
  const cluster = processConfig(config, options)
  return processDefinitions(options.clusterPath, cluster, options)
    .then(services => {
      const keys = Object.keys(services)
      keys.forEach(key => {
        if (cluster.services[key]) {
          Object.assign(cluster.services[key], services[key])
        } else {
          cluster.services[key] = services[key]
        }
      })
      if (cluster.replaceNginxToken) {
        cluster.replaceNginxToken()
      }
      return cluster
    })
}

function onTokens (options, tokens) {
  const missing = tokens.reduce((acc, token) => {
    if (tokens.length && (!options.data || !options.data[token])) {
      acc.push(token)
    }
    return acc
  }, [])
  if (missing.length) {
    const err = new Error(`Cluster specification at '${options.clusterPath}' contains tokens which were not provided`)
    err.tokens = missing
    err.specPath = path.resolve(options.clusterPath)
    throw err
  }
  return options.clusterPath
}

function parseGitUrl (url) {
  const [ , protocol, server, , , owner, , repo, , tag ] = GIT_URL_REGEX.exec(url)
  return {
    protocol,
    server,
    owner,
    repo,
    tag
  }
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
  cluster.levels = Array.from(cluster.levels).map(x => parseInt(x))
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
  const name = Object.keys(data)[0]
  return {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: name,
      namespace: key
    },
    data: data[name]
  }
}

function processDefinitions (fullPath, cluster, options) {
  return glob(fullPath, ['**/*.toml'])
    .then(files => {
      return files.reduce((acc, file) => {
        if (!/cluster[.]toml/.test(file)) {
          const definition = service.parseTOMLFile(file, {
            apiVersion: cluster.apiVersion,
            addConfigFile: addConfigFile.bind(null, cluster, options),
            data: options.data
          })
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
  getTokenList: getTokenList,
  processConfig: processConfig,
  processDefinitions: processDefinitions,
  processNamespace: processNamespace,
  processService: processService
}
