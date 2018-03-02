module.exports = {
  networkPolicy: {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'NetworkPolicy',
    metadata: {
      name: 'test',
      namespace: 'default',
      labels: {
        name: 'test',
        namespace: 'default'
      }
    },
    spec: {
      egress: [
        {
          ports: [
            {
              port: 5678,
              protocol: 'TCP'
            },
            {
              port: 5679,
              protocol: 'TCP'
            },
            {
              port: 5670,
              protocol: 'UDP'
            }
          ],
          to: [
            {
              ipBlock: {
                cidr: '0.0.0.0/16',
                except: [
                  '10.10.0.0/16'
                ]
              }
            },
            {
              namespaceSelector: {
                matchLabels: {
                  label: 'one',
                  other: 'two'
                }
              }
            },
            {
              podSelector: {
                matchLabels: {
                  a: '1',
                  b: 'this is a whole thing'
                }
              }
            }
          ]
        },
        {
          ports: [
            {
              port: 5984,
              protocol: 'TCP'
            }
          ],
          to: [
            {
              podSelector: {
                matchLabels: {
                  name: 'databass'
                }
              }
            }
          ]
        }
      ],
      ingress: [
        {
          from: [
            {
              ipBlock: {
                cidr: '172.1.0.0/16'
              }
            },
            {
              ipBlock: {
                cidr: '172.1.0.0/16',
                except: [
                  '172.1.2.0/16',
                  '172.1.3.0/16'
                ]
              }
            },
            {
              namespaceSelector: {
                matchLabels: {
                  label: 'one',
                  other: 'two'
                }
              }
            },
            {
              podSelector: {
                matchLabels: {
                  a: '1',
                  b: 'this is a whole thing'
                }
              }
            }
          ],
          ports: [
            {
              port: 1234,
              protocol: 'TCP'
            },
            {
              port: 1235,
              protocol: 'TCP'
            },
            {
              port: 1235,
              protocol: 'UDP'
            }
          ]
        },
        {
          from: [
            {
              namespaceSelector: {
                matchLabels: {
                  name: 'data'
                }
              }
            }
          ]
        }
      ],
      podSelector: {
        matchLabels: {
          name: 'pod',
          namespace: 'default'
        }
      },
      policyTypes: [
        'Ingress',
        'Egress'
      ]
    }
  }
}
