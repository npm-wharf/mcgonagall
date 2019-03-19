const nginxLocation = require('./nginxLocation')
const fs = require('fs')
const path = require('path')

function addNginxBlock (relativePath, fqn) {
  const fullPath = path.join(relativePath, 'location.conf')
  const [, namespace] = fqn.split('.')
  if (fs.existsSync(fullPath)) {
    nginxLocation.addBlock(fqn, fullPath)
  } else {
    fs.readdirSync(relativePath).forEach(f => {
      if (/.*location.conf$/.test(f)) {
        const [ n, ns, , ] = f.split('.')
        if (ns === 'location') {
          fqn = [n, namespace].join('.')
        } else {
          fqn = [n, ns].join('.')
        }
        nginxLocation.addBlock(fqn, path.join(relativePath, f))
      }
    })
  }
}

function buildNginxBlock (config) {
  const fqdn = [config.name, config.namespace].join('.')
  const port = config.port
  const subdomain = config.service.subdomain
  const data = {
    port,
    subdomain,
    fqdn
  }
  const nginxBlock = nginxLocation.getBlock(fqdn, data)
  return { nginxBlock }
}

module.exports = {
  addNginxBlock: addNginxBlock,
  buildNginxBlock: buildNginxBlock
}
