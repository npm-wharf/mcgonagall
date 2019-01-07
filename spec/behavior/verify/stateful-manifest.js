module.exports = {
  fqn: 'mydb.data',
  name: 'mydb',
  namespace: 'data',
  statefulSet: {
    apiVersion: 'apps/v1beta2',
    kind: 'StatefulSet',
    metadata: {
      namespace: 'data',
      name: 'mydb',
      owner: 'npm',
      branch: 'master',
      labels: {
        name: 'mydb',
        namespace: 'data'
      }
    },
    spec: {
      serviceName: 'datums',
      replicas: 2,
      revisionHistoryLimit: 1,
      updateStrategy: {
        type: 'RollingUpdate'
      },
      selector: {
        matchLabels: {
          app: 'datums'
        }
      },
      template: {
        metadata: {
          labels: {
            app: 'datums',
            name: 'mydb',
            namespace: 'data'
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
                  cpu: '500m'
                },
                limits: {
                  memory: '1024Mi',
                  cpu: '1000m'
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
                  ]
                },
                initialDelaySeconds: 5,
                periodSeconds: 30
              },
              readinessProbe: {
                httpGet: {
                  path: '/_monitor/ping',
                  port: 9999
                },
                initialDelaySeconds: 5,
                periodSeconds: 5,
                timeoutSeconds: 1,
                successThreshold: 1,
                failureThreshold: 3
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
                    key: 'conf/mydb.conf',
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
          app: 'datums',
          name: 'datums',
          namespace: 'data'
        }
      },
      spec: {
        clusterIP: 'None',
        selector: {
          app: 'datums'
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
    },
    {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        namespace: 'data',
        name: 'mydb',
        labels: {
          app: 'mydb',
          name: 'mydb',
          namespace: 'data'
        }
      },
      spec: {
        selector: {
          app: 'datums'
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
