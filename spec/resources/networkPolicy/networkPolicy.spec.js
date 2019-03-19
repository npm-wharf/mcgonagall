require('../../setup')
const fs = require('fs')
const path = require('path')
const toml = require('toml-j0.4')

const { createNetworkPolicy } = require('../../../src/resources/networkPolicy')
const manifest1 = require('./network-policy-manifest-1')

function createFromToml (file) {
  const fullPath = path.join(path.resolve('./spec/resources/networkPolicy/'), file)
  const raw = fs.readFileSync(fullPath, 'utf8')
  const spec = toml.parse(raw)
  return createNetworkPolicy(spec)
}

describe('Network Policy', function () {
  describe('when creating default ingress and egress policies', function () {
    it('should create deny all ingress', function () {
      const manifest = require('./deny-all-ingress-manifest.js')
      createFromToml('deny-all-ingress.toml').should.eql(manifest)
    })

    it('should create accept all ingress', function () {
      const manifest = require('./accept-all-ingress-manifest.js')
      createFromToml('accept-all-ingress.toml').should.eql(manifest)
    })

    it('should create deny all egress', function () {
      const manifest = require('./deny-all-egress-manifest.js')
      createFromToml('deny-all-egress.toml').should.eql(manifest)
    })

    it('should create accept all egress', function () {
      const manifest = require('./accept-all-egress-manifest.js')
      createFromToml('accept-all-egress.toml').should.eql(manifest)
    })
  })

  it('should create networkPolicy from toml spec', function () {
    createFromToml('network-policy-spec-1.toml').should.eql(manifest1)
  })

  it('should create networkPolicy from object representation', function () {
    createNetworkPolicy({
      apiVersion: '1.8',
      name: 'test',
      namespace: 'default',
      network: {
        selector: 'name:pod;namespace:default',
        ingress: [
          {
            from: [
              '172.1.0.0/16',
              '172.1.0.0/16 ! 172.1.2.0/16 ! 172.1.3.0/16',
              'namespace=label:one;other:two',
              'pod=a:1;b:this is a whole thing'
            ],
            ports: [
              '1234',
              '1235.tcp',
              '1235.udp'
            ]
          },
          {
            from: [
              'namespace=name:data'
            ]
          }
        ],
        egress: [
          {
            to: [
              '0.0.0.0/16 ! 10.10.0.0/16',
              'namespace=label:one;other:two',
              'pod=a:1;b:this is a whole thing'
            ],
            ports: [
              '5678',
              '5679.tcp',
              '5670.udp'
            ]
          },
          {
            to: [
              'pod=name:databass'
            ],
            ports: [
              '5984'
            ]
          }
        ]
      }
    }).should.eql(manifest1)
  })
})
