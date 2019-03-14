const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')

function prepare (targetPath) {
  return mkdirp.sync(targetPath)
}

function write (targetPath, content) {
  mkdirp.sync(path.extname(targetPath) ? path.dirname(targetPath) : targetPath)
  try {
    return fs.writeFileSync(targetPath, content, 'utf8')
  } catch (e) {
    throw new Error(`Failed to write configuration to ${targetPath} because: ${e.message}`)
  }
}

module.exports = {
  write,
  prepare
}
