require('./setup')

const definition = require('../src/definition')
const statefulManifest = require('./stateful-manifest')
const deploymentManifest = require('./deployment-manifest')
const securityManifest1 = require('./security-manifest-1')
const securityManifest2 = require('./security-manifest-2')

describe('Kube Definition', function () {
  it('should create kubernetes manifests from definition', function () {
    const cluster = {
      namespaces: [],
      services: {},
      order: {},
      levels: new Set(),
      apiVersion: '1.8',
      configuration: []
    }
    definition.createFromFile(cluster, './spec/statefulset1.toml', {apiVersion: '1.8'})
      .should.eql(statefulManifest)
  })

  it('should create kubernetes manifests from definition', function () {
    const cluster = {
      namespaces: [],
      services: {},
      order: {},
      levels: new Set(),
      apiVersion: '1.8',
      configuration: []
    }
    definition.createFromFile(cluster, './spec/deployment1.toml', {apiVersion: '1.8'})
      .should.eql(deploymentManifest)
  })

  it('should create security manifest only', function () {
    const cluster = {
      namespaces: [],
      services: {},
      order: {},
      levels: new Set(),
      apiVersion: '1.8',
      configuration: []
    }
    definition.createFromFile(cluster, './spec/security1.toml', {apiVersion: '1.8'})
      .should.eql(securityManifest1)

    definition.createFromFile(cluster, './spec/security2.toml', {apiVersion: '1.8'})
      .should.eql(securityManifest2)
  })
})
