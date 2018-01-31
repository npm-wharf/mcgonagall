require('./setup')

const definition = require('../src/definition')
const statefulManifest = require('./stateful-manifest')
const deploymentManifest = require('./deployment-manifest')

describe('Kube Definition', function () {
  it('should create kubernetes manifests from definition', function () {
    const cluster = {
      namespaces: [],
      services: {},
      order: {},
      levels: new Set(),
      apiVersion: '1.7',
      configuration: []
    }
    definition.createFromFile(cluster, './spec/statefulset1.toml', {apiVersion: '1.7'})
      .should.eql(statefulManifest)
  })

  it('should create kubernetes manifests from definition', function () {
    const cluster = {
      namespaces: [],
      services: {},
      order: {},
      levels: new Set(),
      apiVersion: '1.7',
      configuration: []
    }
    definition.createFromFile(cluster, './spec/deployment1.toml', {apiVersion: '1.7'})
      .should.eql(deploymentManifest)
  })
})
