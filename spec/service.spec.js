require('./setup')
const fs = require('fs')

const serviceDefinition = require('../src/serviceDefinition')

const definition1 = fs.readFileSync('./spec/statefulset1.toml', 'utf8')

const statefulManifest = require('./stateful-manifest')
const deploymentManifest = require('./deployment-manifest')

describe('Kube Definition', function () {
  it('should create kubernetes manifests from definition', function () {
    serviceDefinition.parseTOMLContent(definition1)
      .should.eql(statefulManifest)
  })

  it('should create kubernetes manifests from definition', function () {
    serviceDefinition.parseTOMLFile('./spec/deployment1.toml')
      .should.eql(deploymentManifest)
  })
})
