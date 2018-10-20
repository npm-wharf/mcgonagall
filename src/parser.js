const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const toml = require('toml-j0.4')
const yaml = require('js-yaml')
const tokenizer = require('./tokenizer')
const { addNginxBlock } = require('./resources/nginxBlock')

const DEPLOYMENT_DEFAULTS = {
  unavailable: 1,
  surge: 1,
  history: 1
}

function parseRawContent (raw, options = {}) {
  let config
  if (tokenizer.hasTokens(raw)) {
    config = yaml.safeLoad(_.template(raw)(options.data))
  } else {
    config = yaml.safeLoad(raw)
  }
  const set = {
  }
  const metadata = config.metadata
  set.name = metadata.name
  set.namespace = metadata.namespace || 'default'
  set.fqn = `${set.name}.${set.namespace}`
  const key = config.kind.slice(0, 1).toLowerCase() + config.kind.slice(1)
  set[key] = config
  return set
}

function parseRawFile (filePath, options = {}) {
  const fullPath = path.resolve(filePath)
  try {
    const raw = fs.readFileSync(fullPath, 'utf8')
    const relativePath = path.dirname(fullPath)
    options.file = fullPath
    options.relativePath = relativePath
    return parseRawContent(raw, options)
  } catch (ex) {
    throw new Error(`Failed to parse raw YAML file ${fullPath}: ${ex.message}, ${ex.stack}`)
  }
}

function parseTOMLContent (raw, options = {}) {
  const apiVersion = options.apiVersion || '1.9'
  const addConfigFile = options.addConfigFile
  const setScale = options.setScale
  let config
  if (tokenizer.hasTokens(raw)) {
    config = toml.parse(_.template(raw)(options.data))
  } else {
    config = toml.parse(raw)
  }
  config.apiVersion = apiVersion
  if (addConfigFile) {
    config.addConfigFile = addConfigFile
  }
  if (options.relativePath) {
    addNginxBlock(options.relativePath, config.name)
  }
  if (setScale) {
    setScale(config)
  }
  config.service = config.service || {}
  config.deployment = Object.assign({}, DEPLOYMENT_DEFAULTS, config.deployment)
  return config
}

function parseTOMLFile (filePath, options = {}) {
  const fullPath = path.resolve(filePath)
  try {
    const raw = fs.readFileSync(fullPath, 'utf8')
    const relativePath = path.dirname(fullPath)
    options.file = fullPath
    options.relativePath = relativePath
    return parseTOMLContent(raw, options)
  } catch (ex) {
    throw new Error(`Failed to parse TOML file ${fullPath}: ${ex.message}, ${ex.stack}`)
  }
}

module.exports = {
  parseRawContent: parseRawContent,
  parseRawFile: parseRawFile,
  parseTOMLFile: parseTOMLFile,
  parseTOMLContent: parseTOMLContent
}
