require('../setup')
const fs = require('fs')
const path = require('path')
const toml = require('toml-j0.4')
const {createNetworkPolicy} = require('../../src/resources/networkPolicy')
const spec1raw = fs.readFileSync(path.resolve('./spec/resources/network-policy-spec-1.toml'), 'utf8')
const spec1 = toml.parse(spec1raw)
const manifest1 = require('./network-policy-manifest-1')
describe('Network Policy', function () {
  it('should create networkPolicy from toml spec', function () {
    createNetworkPolicy(spec1).should.eql(manifest1)
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
