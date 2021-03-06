const path = require('path')

let output
let basePath

function prepare (targetPath) {
  output = {}
  basePath = targetPath
  return true
}

function write (targetPath, contents) {
  const segments = path.normalize(targetPath).split(path.sep)
  const leaf = segments[segments.length - 1]
  let target = output

  for (let key of segments.slice(0, -1)) {
    if (!target.hasOwnProperty(key)) { target[key] = {} }
    target = target[key]
  }

  if (target.hasOwnProperty(leaf)) {
    console.warn(`WARNING: output property at ${targetPath.toString()} was overwritten`)
  } else if (typeof target !== 'object') {
    console.warn(`WARNING: did not assign property at ${targetPath.toString()} since the penultimate component was not an object`)
  }

  target[leaf] = contents
}

function result () {
  const prefix = path.normalize(basePath).split(path.sep)
  let result = output
  for (const segment of prefix) {
    result = result[segment]
  }
  return result
}

module.exports = {
  write,
  prepare,
  result
}
