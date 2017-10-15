module.exports = {
  fqn: 'mydb.data',
  name: 'mydb',
  namespace: 'data',
  statefulSet: {
    apiVersion: 'apps/v1beta1',
    kind: 'StatefulSet',
    metadata: {
      namespace: 'data',
      name: 'mydb',
      owner: 'npm',
      branch: 'master'
    },
    spec: {
      serviceName: 'datums',
      replicas: 2,
      revisionHistoryLimit: 1,
      template: {
        metadata: {
          labels: {
            app: 'mydb'
          }
        },
        spec: {
          containers: [
            {
              name: 'mydb',
              image: 'pretend/mydb:1.0.0',
              resources: {
                requests: {
                  memory: '500Mi',
                  cpu: 0.5
                },
                limits: {
                  memory: '1024Mi',
                  cpu: 1
                }
              },
              command: [
                'bash',
                '-exc',
                'export',
                'HOST="$(hostname).datums"',
                'mydb'
              ],
              livenessProbe: {
                exec: {
                  command: [
                    'mydb',
                    'test'
                  ],
                  initialDelaySeconds: 5,
                  periodSeconds: 30
                }
              },
              readinessProbe: {
                httpGet: {
                  path: '/_monitor/ping',
                  port: 9999,
                  initialDelaySeconds: 5,
                  periodSeconds: 5,
                  timeoutSeconds: 1,
                  successThreshold: 1,
                  failureThreshold: 3
                }
              },
              env: [
                {
                  name: 'ONE',
                  value: 'http://one:1234/wat'
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
              ],
              ports: [
                {
                  name: 'tcp',
                  containerPort: 9080,
                  protocol: 'TCP'
                },
                {
                  name: 'http',
                  containerPort: 8080,
                  protocol: 'TCP'
                }
              ],
              volumeMounts: [
                {
                  name: 'mydb-data',
                  mountPath: '/data'
                },
                {
                  name: 'config',
                  mountPath: '/etc/mydb'
                }
              ]
            }
          ],
          volumes: [
            {
              name: 'config',
              configMap: {
                name: 'actual-config',
                items: [
                  {
                    key: 'mydb.conf',
                    path: 'mydb.conf'
                  },
                  {
                    key: 'ssl.cert',
                    path: 'cert/ssl.cert'
                  }
                ]
              }
            }
          ]
        }
      },
      volumeClaimTemplates: [
        {
          metadata: {
            namespace: 'data',
            name: 'mydb-data'
          },
          spec: {
            accessModes: [ 'ReadWriteOnce' ],
            resources: {
              requests: {
                storage: '10Gi'
              }
            }
          }
        }
      ]
    }
  },
  services: [
    {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        namespace: 'data',
        name: 'datums',
        labels: {
          app: 'datums'
        }
      },
      spec: {
        clusterIP: 'None',
        selector: {
          app: 'mydb'
        },
        ports: [
          {
            name: 'tcp',
            port: 9080,
            targetPort: 9080,
            protocol: 'TCP'
          },
          {
            name: 'http',
            port: 8080,
            targetPort: 8080,
            protocol: 'TCP'
          }
        ],
        clusterIP: "None"
      }
    },
    {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        namespace: 'data',
        name: 'mydb',
        labels: {
          app: 'mydb'
        }
      },
      spec: {
        selector: {
          app: 'mydb'
        },
        ports: [
          {
            name: 'tcp',
            port: 9080,
            targetPort: 9080,
            protocol: 'TCP'
          },
          {
            name: 'http',
            port: 8080,
            targetPort: 8080,
            protocol: 'TCP'
          }
        ]
      }
    }
  ]
}
