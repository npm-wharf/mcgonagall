require('../setup')

const definition = require('../../src/definition')
const statefulManifest = require('./verify/stateful-manifest')
const deploymentManifest = require('./verify/deployment-manifest')
const securityManifest1 = require('./verify/security-manifest-1')
const securityManifest2 = require('./verify/security-manifest-2')

describe('Kube Definition', function () {
  it('should create kubernetes manifests from definition', function () {
    const cluster = {
      namespaces: [],
      resources: {},
      order: {},
      levels: new Set(),
      apiVersion: '1.8',
      configuration: [
        {
          metadata: {
            name: 'config-map',
            namespace: 'data'
          },
          data: {
            a_thing: 'test'
          }
        }
      ],
      secrets: [],
      imagePullSecrets: {}
    }
    definition.createFromFile(cluster, './spec/behavior/source/statefulset1.toml', { apiVersion: '1.8' })
      .should.eql(statefulManifest)
  })

  it('should create kubernetes manifests from definition', function () {
    const cluster = {
      namespaces: [],
      resources: {},
      order: {},
      levels: new Set(),
      apiVersion: '1.8',
      configuration: [
        {
          metadata: {
            name: 'config-map',
            namespace: 'data'
          },
          data: {
            a_thing: 'test'
          }
        }
      ],
      secrets: [
        {
          metadata: {
            name: 'connection',
            namespace: 'data'
          },
          data: {
            username: 'test',
            password: 'test'
          }
        }
      ],
      imagePullSecrets: {}
    }
    definition.createFromFile(cluster, './spec/behavior/source/deployment1.toml', { apiVersion: '1.8' })
      .should.eql(deploymentManifest)
  })

  it('should create security manifest only', function () {
    const cluster = {
      namespaces: [],
      resources: {},
      order: {},
      levels: new Set(),
      apiVersion: '1.8',
      configuration: [],
      secrets: [],
      imagePullSecrets: {}
    }
    definition.createFromFile(cluster, './spec/behavior/source/security1.toml', { apiVersion: '1.8' })
      .should.eql(securityManifest1)

    definition.createFromFile(cluster, './spec/behavior/source/security2.toml', { apiVersion: '1.8' })
      .should.eql(securityManifest2)
  })
})
