const _ = require('lodash')
const fs = require('fs')
const glob = require('globulesce')
const path = require('path')
const definition = require('./definition')
const tar = require('tar')
const toml = require('toml-j0.4')
const git = require('simple-git/promise')
const tokenizer = require('./tokenizer')
const hasher = require('./hasher')
const { getVolumeTokens } = require('./resource')

const CLUSTER_FILE = 'cluster.toml'
const GIT_URL_REGEX = /(https[:][/]{2}|git[:][/]{2}|git[@])([^/]+)(([/]|[:])([^/]+))([/]([^/:]+))([:]([a-z0-9_.-]+))?/i

_.templateSettings.imports.hash = hasher.hash

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

function getTokenList (fullPath) {
  return glob(fullPath, ['**/*.+(toml|raw.yml)'])
    .then(files => {
      return _.uniq(_.flatten(
        files.map(file => {
          let tokens = []
          let content = fs.readFileSync(file, 'utf8')
          const fileTokens = tokenizer.getTokens(content)
          if (/toml$/.test(file)) {
            if (fileTokens.length > 0) {
              const filler = fileTokens.reduce((acc, token) => {
                if (token !== 'hash') {
                  acc[token] = 'empty'
                }
                return acc
              }, {})
              content = _.template(content)(filler)
            }
            const basePath = path.dirname(file)
            const spec = toml.parse(content)
            tokens = tokens.concat(getVolumeTokens(basePath, spec))
          }

          tokens = tokens.concat(fileTokens)
          return tokens
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

  if (config.scaleOrder) {
    cluster.scaleOrder = config.scaleOrder
      .split(',')
      .map(x => x.trim())
  }

  const namespaces = Object.keys(config)
  namespaces.forEach(name => {
    if (name !== 'configuration' && typeof config[name] !== 'string') {
      let namespace = config[name]
      processNamespace(config, cluster, name, namespace)
    }
  })
  cluster.levels = Array
    .from(cluster.levels)
    .reduce((acc, x) => {
      if (x != null) {
        acc.push(parseInt(x))
      }
      return acc
    }, [])
  cluster.levels.sort((x, y) => x - y)
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
  return glob(fullPath, ['**/*.+(toml|raw.yml)'])
    .then(files => {
      return files.reduce((acc, file) => {
        const resources = definition.createFromFile(cluster, file, options)
        if (resources) {
          acc[resources.fqn] = resources
        }
        return acc
      }, {})
    })
}

function processNamespace (config, cluster, namespace, obj) {
  cluster.namespaces.push(namespace)
  const keys = Object.keys(obj)
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
