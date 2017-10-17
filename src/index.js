const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')
const yaml = require('js-yaml')
const cluster = require('./cluster')

const CLUSTER_FILE = 'cluster.json'

function ensurePath(fullPath) {
  const directoryPath = path.extname(fullPath) ?
    path.dirname(fullPath) : fullPath
  if (!fs.existsSync(directoryPath)) {
    mkdirp.sync(directoryPath)
  }
}

function transfigure (source, options = {}) {
  return cluster.getClusterConfig(source, options)
    .then(config => {
      if(options.output) {
        return write(options.output, config)
      } else {
        return config
      }
    })
}

function write(target, config) {
  const services = config.services
  delete config.services
  ensurePath(target)
  writeCluster(target, config)
  const keys = Object.keys(services)
  keys.forEach(key => {
    const definition = services[key]
    const name = definition.name
    const namespace = definition.namespace
    const types = Object.keys(definition)
    types.forEach(type => {
      switch(type) {
        case 'account':
          writeAccount(target, namespace, name, definition[type])
          break;
        case 'cronJob':
          writeCronJob(target, namespace, name, definition[type])
          break;
        case 'daemonSet':
          writeDaemonSet(target, namespace, name, definition[type])
          break;
        case 'deployment':
          writeDeployment(target, namespace, name, definition[type])
          break;
        case 'job':
          writeJob(target, namespace, name, definition[type])
          break;
        case 'nginxBlock':
          writeNginx(target, namespace, name, definition[type])
          break;
        case 'roleBinding':
          writeRoleBinding(target, namespace, name, definition[type])
          break;
        case 'services':
          writeService(target, namespace, name, definition[type])
          break;
        case 'statefulSet':
          writeStatefulSet(target, namespace, name, definition[type])
          break;
      }
    })
  })
}

function writeAccount (target, namespace, name, definition) {
  const fullPath = path.join(target, namespace, name, 'account.yml')
  const yml = yaml.safeDump(definition)
  try {
    ensurePath(fullPath)
    fs.writeFileSync(fullPath, yml, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write account to ${fullPath} because: ${e.message}`)
  }
}

function writeCluster (target, definition) {
  const fullPath = path.join(target, CLUSTER_FILE)
  const json = JSON.stringify(definition, null, 2) + '\n'
  try {
    ensurePath(fullPath)
    fs.writeFileSync(fullPath, json, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write cluster configuration to ${fullPath} because: ${e.message}`)
  }
}

function writeConfigFile (taget, namespace, fileName, file) {
  const fullPath = path.join(target, namespace, name, fileName)
  try {
    ensurePath(fullPath)
    fs.writeFileSync(fullPath, file, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write configuration file to ${fullPath} because: ${e.message}`)
  }
}

function writeCronJob (target, namespace, name, definition) {
  const fullPath = path.join(target, namespace, name, 'cronJob.yml')
  const yml = yaml.safeDump(definition)
  try {
    ensurePath(fullPath)
    fs.writeFileSync(fullPath, yml, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write cron job to ${fullPath} because: ${e.message}`)
  }
}

function writeDaemonSet (target, namespace, name, definition) {
  const fullPath = path.join(target, namespace, name, 'daemonSet.yml')
  const yml = yaml.safeDump(definition)
  try {
    ensurePath(fullPath)
    fs.writeFileSync(fullPath, yml, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write daemon set to ${fullPath} because: ${e.message}`)
  }
}

function writeDeployment (target, namespace, name, definition) {
  const fullPath = path.join(target, namespace, name, 'deployment.yml')
  const yml = yaml.safeDump(definition)
  try {
    ensurePath(fullPath)
    fs.writeFileSync(fullPath, yml, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write deployment to ${fullPath} because: ${e.message}`)
  }
}

function writeJob (target, namespace, name, definition) {
  const fullPath = path.join(target, namespace, name, 'job.yml')
  const yml = yaml.safeDump(definition)
  try {
    ensurePath(fullPath)
    fs.writeFileSync(fullPath, yml, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write job to ${fullPath} because: ${e.message}`)
  }
}

function writeNginx (target, namespace, name, definition) {
  const fullPath = path.join(target, namespace, name, 'nginx.conf')
  try {
    ensurePath(fullPath)
    fs.writeFileSync(fullPath, definition, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write nginx configuration to ${fullPath} because: ${e.message}`)
  }
}

function writeRoleBinding (target, namespace, name, definition) {
  const fullPath = path.join(target, namespace, name, 'roleBinding.yml')
  const yml = yaml.safeDump(definition)
  try {
    ensurePath(fullPath)
    fs.writeFileSync(fullPath, yml, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write role binding to ${fullPath} because: ${e.message}`)
  }
}

function writeStatefulSet (target, namespace, name, definition) {
  const fullPath = path.join(target, namespace, name, 'statefulSet.yml')
  const yml = yaml.safeDump(definition)
  try {
    ensurePath(fullPath)
    fs.writeFileSync(fullPath, yml, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write stateful set to ${fullPath} because: ${e.message}`)
  }
}

function writeService (target, namespace, name, definition) {
  const fullPath = path.join(target, namespace, name, 'service.yml')
  const yml = yaml.safeDump(definition)
  try {
    ensurePath(fullPath)
    fs.writeFileSync(fullPath, yml, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write service to ${fullPath} because: ${e.message}`)
  }
}

module.exports = {
  transfigure: transfigure
}
