require('../setup')

const expressionParser = require('../../src/expressionParser')
const {
  checkCPUScale,
  checkEgressBlock,
  checkIngressBlock,
  checkPolicyPort,
  checkPodSelector,
  checkProbe,
  checkRAMScale,
  checkVolumeMap
} = require('../../src/validation')

describe('Expression Parser', function () {
  it('should parse metadata correctly', function () {
    expressionParser.parseMetadata(
      'owner=npm;branch=master'
    )
      .should.eql({
        owner: 'npm',
        branch: 'master'
      })
  })

  it('should parse command', function () {
    expressionParser.parseCommand(
      'testCommand --arg1=one --arg2 2 --arg3 /file/path'
    )
      .should.eql({
        command: [
          'testCommand',
          '--arg1=one',
          '--arg2',
          '2',
          '--arg3',
          '/file/path'
        ]
      })
  })

  it('should parse security context', function () {
    expressionParser.parseContext(
      'group=2000;user=1000'
    ).should.eql({
      runAsUser: 1000,
      fsGroup: 2000
    })
  })

  describe('volume parser', function () {
    it('should parse config maps', function () {
      checkVolumeMap('test::file1.txt,file2.txt').should.equal(true)
      expressionParser.parseVolume('vol-name', 'test::file1.txt,file2.txt')
        .should.eql({
          name: 'vol-name',
          configMap: {
            name: 'test',
            items: [
              {
                key: 'file1.txt',
                path: 'file1.txt'
              },
              {
                key: 'file2.txt',
                path: 'file2.txt'
              }
            ]
          }
        })
    })

    it('should parse config maps with permissions', function () {
      checkVolumeMap('test::file1.txt=subdir/file.txt:0664,file2.txt:0400').should.equal(true)
      expressionParser.parseVolume('vol-name', 'test::file1.txt=subdir/file.txt:0664,file2.txt:0400')
        .should.eql({
          name: 'vol-name',
          configMap: {
            name: 'test',
            items: [
              {
                mode: 436,
                key: 'file1.txt',
                path: 'subdir/file.txt'
              },
              {
                mode: 256,
                key: 'file2.txt',
                path: 'file2.txt'
              }
            ],
            defaultMode: 436
          }
        })
    })

    it('should parse secret', function () {
      checkVolumeMap('secret::my-secret').should.equal(true)
      expressionParser.parseVolume('vol-name', 'secret::my-secret')
        .should.eql({
          name: 'vol-name',
          secret: {
            secretName: 'my-secret'
          }
        })
    })

    it('should parse secret with permissions', function () {
      checkVolumeMap('secret::my-secret:0400').should.equal(true)
      expressionParser.parseVolume('vol-name', 'secret::my-secret:0400')
        .should.eql({
          name: 'vol-name',
          secret: {
            secretName: 'my-secret',
            defaultMode: 256
          }
        })
    })

    it('should parse host path', function () {
      checkVolumeMap('/a/path/to/thing').should.equal(true)
      expressionParser.parseVolume('vol-name', '/a/path/to/thing')
        .should.eql({
          name: 'vol-name',
          hostPath: {
            path: '/a/path/to/thing',
            type: 'Directory'
          }
        })
    })
  })

  describe('env block parser', function () {
    it('should differentiate between static and config map variables', function () {
      expressionParser.parseEnvironmentBlock(
        {
          configuration: [
            {
              metadata: {
                name: 'config-map',
                namespace: 'test'
              },
              data: {
                'a_thing': '100 billion'
              }
            }
          ],
          secrets: []
        },
        'test',
        {
          ONE: 'http://test:8080',
          'config-map': {
            TWO: 'a_thing'
          }
        }
      ).should.eql(
        [
          {
            name: 'ONE',
            value: 'http://test:8080'
          },
          {
            name: 'TWO',
            valueFrom: {
              configMapKeyRef: {
                name: 'config-map',
                key: 'a_thing'
              }
            }
          }
        ]
      )
    })

    it('should differentiate between config map and fieldRef variables', function () {
      expressionParser.parseEnvironmentBlock(
        {
          configuration: [],
          secrets: []
        },
        'test',
        {
          ONE: 'http://test:8080',
          'fieldRef': {
            TWO: 'spec.nodeName',
            THREE: 'spec.otherThing'
          }
        }
      ).should.eql(
        [
          {
            name: 'ONE',
            value: 'http://test:8080'
          },
          {
            name: 'TWO',
            valueFrom: {
              fieldRef: {
                fieldPath: 'spec.nodeName'
              }
            }
          },
          {
            name: 'THREE',
            valueFrom: {
              fieldRef: {
                fieldPath: 'spec.otherThing'
              }
            }
          }
        ]
      )
    })
  })

  describe('image parser', function () {
    it('should parse official image with implicit registry', function () {
      expressionParser.parseImage('postgres:tag')
        .should.eql([
          'hub.docker.com',
          'official',
          'postgres:tag'
        ])
    })

    it('should parse image with implicit registry', function () {
      expressionParser.parseImage('my-repo/my-image:tag')
        .should.eql([
          'hub.docker.com',
          'my-repo',
          'my-image:tag'
        ])
    })

    it('should parse image with explicit registry', function () {
      expressionParser.parseImage('registry.io/my-repo/my-image:tag')
        .should.eql([
          'registry.io',
          'my-repo',
          'my-image:tag'
        ])
    })

    it('should parse image with multi-path registry', function () {
      expressionParser.parseImage('registry.io/some-path/bits/my-repo/my-image:tag')
        .should.eql([
          'registry.io/some-path/bits',
          'my-repo',
          'my-image:tag'
        ])
    })
  })

  describe('scale parsers', function () {
    it('should add resource to resources hash from service scale setting', function () {
      const resources = {
        resources: {}
      }

      checkRAMScale('> 500Mi < 1Gi').should.equal(true)
      checkCPUScale('> 50% < 1.25').should.equal(true)
      expressionParser.addResource(resources, 'ram', '> 500Mi < 1Gi')
      expressionParser.addResource(resources, 'cpu', '> 50% < 1.25')

      resources.should.eql({
        resources: {
          requests: {
            memory: '500Mi',
            cpu: '500m'
          },
          limits: {
            memory: '1024Mi',
            cpu: '1250m'
          }
        }
      })
    })

    it('should create correct set of scale factors', function () {
      checkRAMScale('> 750Mi < 1.5Gi').should.equal(true)
      checkCPUScale('> .75 < 1.5').should.equal(true)
      expressionParser.parseScaleFactor(
        'container + 2; cpu > .75 < 1.5; ram > 750Mi < 1.5Gi; storage = data + 5Gi, logs + 2Gi'
      ).should.eql(
        {
          containers: ['+', '2'],
          cpu: '> .75 < 1.5',
          ram: '> 750Mi < 1.5Gi',
          storage: {
            data: '5',
            logs: '2'
          }
        }
      )

      checkRAMScale('> 750Mi').should.equal(true)
      checkCPUScale('> .75').should.equal(true)
      expressionParser.parseScaleFactor(
        'cpu > .75; ram > 750Mi; storage = data + 5Gi'
      ).should.eql(
        {
          cpu: '> .75',
          ram: '> 750Mi',
          storage: {
            data: '5'
          }
        }
      )

      checkRAMScale('<1.5Gi').should.equal(true)
      checkCPUScale('<1.5').should.equal(true)
      expressionParser.parseScaleFactor(
        'container*2;cpu<1.5;ram<1.5Gi'
      ).should.eql(
        {
          containers: ['*', '2'],
          ram: '<1.5Gi',
          cpu: '<1.5'
        }
      )
    })
  })

  describe('port parsers', function () {
    it('should parse service container port', function () {
      expressionParser.parsePorts({ http: '8080' }, true)
        .should.eql([
          {
            name: 'http',
            port: 8080,
            targetPort: 8080,
            protocol: 'TCP'
          }
        ])
    })

    it('should parse service container and target port', function () {
      expressionParser.parsePorts({ http: '8000<=8080' }, true)
        .should.eql([
          {
            name: 'http',
            port: 8080,
            targetPort: 8000,
            protocol: 'TCP'
          }
        ])
    })

    it('should parse service container and node port', function () {
      expressionParser.parsePorts({ http: '8080=>80' }, true)
        .should.eql([
          {
            name: 'http',
            port: 8080,
            targetPort: 8080,
            nodePort: 80,
            protocol: 'TCP'
          }
        ])
    })

    it('should parse service container, target and node port', function () {
      expressionParser.parsePorts({ http: '8000<=8080=>80' }, true)
        .should.eql([
          {
            name: 'http',
            port: 8080,
            targetPort: 8000,
            nodePort: 80,
            protocol: 'TCP'
          }
        ])
    })

    it('should parse container port', function () {
      expressionParser.parsePorts({ http: '8080' })
        .should.eql([
          {
            name: 'http',
            containerPort: 8080,
            protocol: 'TCP'
          }
        ])
    })

    it('should parse container and target port', function () {
      expressionParser.parsePorts({ http: '8000<=8080' })
        .should.eql([
          {
            name: 'http',
            containerPort: 8000,
            protocol: 'TCP'
          }
        ])
    })

    it('should parse container and node port', function () {
      expressionParser.parsePorts({ http: '8080=>80' })
        .should.eql([
          {
            name: 'http',
            containerPort: 8080,
            protocol: 'TCP'
          }
        ])
    })

    it('should parse container, target and node port', function () {
      expressionParser.parsePorts({ http: '8000<=8080=>80' })
        .should.eql([
          {
            name: 'http',
            containerPort: 8000,
            protocol: 'TCP'
          }
        ])
    })
  })

  describe('probe parsers', function () {
    it('should parse tcp probes correctly', function () {
      checkProbe('port:8080').should.equal(true)
      expressionParser.parseProbe('port:8080')
        .should.eql({
          tcpSocket: {
            port: 8080
          }
        })

      checkProbe('port:8080,initial=5,period=5,timeout=1').should.equal(true)
      expressionParser.parseProbe('port:8080,initial=5,period=5,timeout=1')
        .should.eql({
          tcpSocket: {
            port: 8080
          },
          initialDelaySeconds: 5,
          periodSeconds: 5,
          timeoutSeconds: 1
        })

      checkProbe('port:tcp').should.equal(true)
      expressionParser.parseProbe('port:tcp')
        .should.eql({
          tcpSocket: {
            port: 'tcp'
          }
        })

      checkProbe('port:tcp,initial=5,period=5,timeout=1').should.equal(true)
      expressionParser.parseProbe('port:tcp,initial=5,period=5,timeout=1')
        .should.eql({
          tcpSocket: {
            port: 'tcp'
          },
          initialDelaySeconds: 5,
          periodSeconds: 5,
          timeoutSeconds: 1
        })

      checkProbe('port:').should.equal(false)
    })

    it('should parse http probes correctly', function () {
      checkProbe(':8080').should.equal(true)
      expressionParser.parseProbe(':8080')
        .should.eql({
          httpGet: {
            path: '/',
            port: 8080
          }
        })

      checkProbe(':8080,initial=5,period=5,timeout=1').should.equal(true)
      expressionParser.parseProbe(':8080,initial=5,period=5,timeout=1')
        .should.eql({
          httpGet: {
            path: '/',
            port: 8080
          },
          initialDelaySeconds: 5,
          periodSeconds: 5,
          timeoutSeconds: 1
        })

      checkProbe(':8080/test/url?opt=ping,initial=5,period=5,timeout=1').should.equal(true)
      expressionParser.parseProbe(':8080/test/url?opt=ping,initial=5,period=5,timeout=1,success=1,failure=3')
        .should.eql({
          httpGet: {
            path: '/test/url?opt=ping',
            port: 8080
          },
          initialDelaySeconds: 5,
          periodSeconds: 5,
          timeoutSeconds: 1,
          successThreshold: 1,
          failureThreshold: 3
        })

      checkProbe(':http').should.equal(true)
      expressionParser.parseProbe(':http')
        .should.eql({
          httpGet: {
            path: '/',
            port: 'http'
          }
        })

      checkProbe(':http,initial=5,period=5,timeout=1').should.equal(true)
      expressionParser.parseProbe(':http,initial=5,period=5,timeout=1')
        .should.eql({
          httpGet: {
            path: '/',
            port: 'http'
          },
          initialDelaySeconds: 5,
          periodSeconds: 5,
          timeoutSeconds: 1
        })

      checkProbe(':http/test/url?opt=ping,initial=5,period=5,timeout=1,success=1,failure=3').should.equal(true)
      expressionParser.parseProbe(':http/test/url?opt=ping,initial=5,period=5,timeout=1,success=1,failure=3')
        .should.eql({
          httpGet: {
            path: '/test/url?opt=ping',
            port: 'http'
          },
          initialDelaySeconds: 5,
          periodSeconds: 5,
          timeoutSeconds: 1,
          successThreshold: 1,
          failureThreshold: 3
        })

      checkProbe(':').should.equal(false)
    })

    it('should parse command probes correctly', function () {
      checkProbe('test command --with /path/args').should.equal(true)
      expressionParser.parseProbe('test command --with /path/args')
        .should.eql({
          exec: {
            command: [
              'test',
              'command',
              '--with',
              '/path/args'
            ]
          }
        })

      checkProbe('test command --with /path/args,initial=10,period=15').should.equal(true)
      expressionParser.parseProbe('test command --with /path/args,initial=10,period=15')
        .should.eql({
          exec: {
            command: [
              'test',
              'command',
              '--with',
              '/path/args'
            ]
          },
          initialDelaySeconds: 10,
          periodSeconds: 15
        })

      checkProbe('/bin/path/test command --with /path/args,initial=10,period=15').should.equal(true)
      expressionParser.parseProbe('/bin/path/test command --with /path/args,initial=10,period=15')
        .should.eql({
          exec: {
            command: [
              '/bin/path/test',
              'command',
              '--with',
              '/path/args'
            ]
          },
          initialDelaySeconds: 10,
          periodSeconds: 15
        })

      checkProbe('/bin/path/test command --with="/path/args"').should.equal(true)
      checkProbe('/bin/path/test command --with=$ARGS --and=%idek%').should.equal(true)
    })
  })

  describe('network policy', function () {
    it('should parse pod selectors', function () {
      checkPodSelector('').should.eql(true)
      checkPodSelector('one:a').should.equal(true)
      checkPodSelector('one:a;two:oh look spaces').should.equal(true)
      checkPodSelector('one:a;two:2;three:so many').should.equal(true)
      expressionParser.parsePodSelector('one:a')
        .should.eql({
          one: 'a'
        })

      expressionParser.parsePodSelector('one:a lot of stuff;two:be "100";three:c')
        .should.eql({
          one: 'a lot of stuff',
          two: 'be "100"',
          three: 'c'
        })
    })

    it('should parse policy ports', function () {
      checkPolicyPort('8080').should.equal(true)
      checkPolicyPort('8080.tcp').should.equal(true)
      checkPolicyPort('8080.udp').should.equal(true)
      checkPolicyPort('8080.upd').should.equal(false)
      checkPolicyPort('8080.tpc').should.equal(false)
      checkPolicyPort('8080.').should.equal(false)
      expressionParser.parsePolicyPort('8080.tcp')
        .should.eql({
          protocol: 'TCP',
          port: 8080
        })

      expressionParser.parsePolicyPort('6379')
        .should.eql({
          protocol: 'TCP',
          port: 6379
        })

      expressionParser.parsePolicyPort('5445.udp')
        .should.eql({
          protocol: 'UDP',
          port: 5445
        })
    })
  })

  it('should parse ingress and egress specifications', function () {
    checkIngressBlock('172.17.0.0/16').should.equal(true)
    checkIngressBlock('172.17.0.0/16 ! 172.17.1.0/24').should.equal(true)
    checkIngressBlock('namespace=name:kube-system').should.equal(true)
    checkIngressBlock('namespace=name:other;other:extra stuff').should.equal(true)
    checkIngressBlock('pod=label:value').should.equal(true)

    checkEgressBlock('172.17.0.0/16').should.equal(true)
    checkEgressBlock('172.17.0.0/16 ! 172.17.1.0/24').should.equal(true)
    checkEgressBlock('namespace=name:kube-system').should.equal(true)
    checkEgressBlock('namespace=name:other;other:extra stuff').should.equal(true)
    checkEgressBlock('pod=label:value').should.equal(true)

    expressionParser.parseNetworkSource('172.17.0.0/16')
      .should.eql({
        ipBlock: {
          cidr: '172.17.0.0/16'
        }
      })

    expressionParser.parseNetworkSource('172.17.0.0/16 ! 172.17.1.0/24')
      .should.eql({
        ipBlock: {
          cidr: '172.17.0.0/16',
          except: [
            '172.17.1.0/24'
          ]
        }
      })

    expressionParser.parseNetworkSource('172.17.0.0/16 ! 172.17.1.0/24 ! 172.17.5.0/24')
      .should.eql({
        ipBlock: {
          cidr: '172.17.0.0/16',
          except: [
            '172.17.1.0/24',
            '172.17.5.0/24'
          ]
        }
      })

    expressionParser.parseNetworkSource('namespace=name:kube-system')
      .should.eql({
        namespaceSelector: {
          matchLabels: {
            name: 'kube-system'
          }
        }
      })

    expressionParser.parseNetworkSource('namespace=name:kube-system;other:something extra')
      .should.eql({
        namespaceSelector: {
          matchLabels: {
            name: 'kube-system',
            other: 'something extra'
          }
        }
      })

    expressionParser.parseNetworkSource('pod=name:kube-system')
      .should.eql({
        podSelector: {
          matchLabels: {
            name: 'kube-system'
          }
        }
      })

    expressionParser.parseNetworkSource('pod=name:kube-system;other:something extra')
      .should.eql({
        podSelector: {
          matchLabels: {
            name: 'kube-system',
            other: 'something extra'
          }
        }
      })
  })
})
