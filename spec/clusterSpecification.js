const path = require('path')
const fs = require('fs')

const MIME_TYPES = fs.readFileSync(path.resolve('./spec/plain-source/infra', 'mime.types'), 'utf8')
const NGINX_CONF = fs.readFileSync(path.resolve('./spec/', 'full-nginx.conf'), 'utf8')

module.exports = {
  configuration: [
    {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'config',
        namespace: 'infra'
      },
      data: {
        test: 'hello'
      }
    },
    {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'nginx-files',
        namespace: 'infra'
      },
      data: {
        'mime.types': MIME_TYPES,
        'nginx.conf': NGINX_CONF
      }
    },
    {
      'apiVersion': 'v1',
      'kind': 'ConfigMap',
      'metadata': {
        'name': 'self-sign-files',
        'namespace': 'infra'
      },
      'data': {
        'create-cert.sh': "#!/bin/ash\n\nopenssl req -x509 \\\n  -nodes \\\n  -days 365 \\\n  -newkey rsa:2048 \\\n  -keyout ./self-signed.key \\\n  -out ./self-signed.crt \\\n  -subj \"/C=$COUNTRY/ST=$STATE/L=$LOCAL/O=$ORGANIZATION/OU=$UNIT/CN=$FQN/emailAddress=$EMAIL\"\n\ncat ./self-signed.crt ./self-signed.key > ./self-signed.pem\n\ncat ./secret-template.json | \\\n\tsed \"s/NAMESPACE/${NAMESPACE}/\" | \\\n\tsed \"s/NAME/${SECRET}/\" | \\\n\tsed \"s/TLSCERT/$(cat ./self-signed.crt | base64 | tr -d '\\n')/\" | \\\n\tsed \"s/TLSKEY/$(cat ./self-signed.key |  base64 | tr -d '\\n')/\" | \\\n\tsed \"s/TLSPEM/$(cat ./self-signed.pem |  base64 | tr -d '\\n')/\" \\\n\t> ./secret.json\n\n# /var/run/secrets/kubernetes.io/serviceaccount/token\ncurl -v --cacert /var/run/secrets/kubernetes.io/serviceaccount/ca.crt \\\n  -H \"Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)\" \\\n  -H \"Accept: application/json, */*\" \\\n  -H \"Content-Type: application/json\" \\\n  -k -v -X POST \\\n  -d @./secret.json \\\n  https://kubernetes/api/v1/namespaces/${NAMESPACE}/secrets/${SECRET}\n", // eslint-disable-line
        'secret-template.json': '{\n    "kind": "Secret",\n    "apiVersion": "v1",\n    "metadata": {\n        "name": "NAME",\n        "namespace": "NAMESPACE"\n    },\n    "data": {\n       "cert.crt": "TLSCERT",\n       "cert.key": "TLSKEY",\n       "cert.pem": "TLSPEM"\n    },\n    "type": "Opaque"\n}\n'
      }
    }
  ],
  apiVersion: '1.7',
  levels: [0, 10, 50, 100],
  namespaces: [
    'kube-system',
    'infra',
    'data'
  ],
  order: {
    0: [
      'heapster.kube-system'
    ],
    10: [
      'create-cert.infra'
    ],
    50: [
      'chronograf.data',
      'influxdb.data',
      'kapacitor.data'
    ],
    100: [
      'proxy.infra'
    ]
  },
  services: {
    'chronograf.data': {
      statefulSet: {
        apiVersion: 'apps/v1beta1',
        kind: 'StatefulSet',
        metadata: {
          name: 'chronograf',
          namespace: 'data'
        },
        spec: {
          replicas: 1,
          revisionHistoryLimit: 1,
          updateStrategy: {
            type: 'RollingUpdate'
          },
          selector: {
            matchLabels: {
              app: 'chronograf'
            }
          },
          serviceName: 'chrono',
          template: {
            metadata: {
              labels: {
                app: 'chronograf'
              }
            },
            spec: {
              containers: [
                {
                  env: [
                    {
                      name: 'INFLUXDB_URL',
                      value: 'http://influxdb:8086'
                    },
                    {
                      name: 'KAPACITOR_URL',
                      value: 'http://kapacitor:9092'
                    }
                  ],
                  image: 'quay.io/influxdb/chronograf:1.3.5.0',
                  name: 'chronograf',
                  ports: [
                    {
                      containerPort: 8888,
                      name: 'http',
                      protocol: 'TCP'
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: '200m',
                      memory: '200Mi'
                    },
                    requests: {
                      cpu: '100m',
                      memory: '50Mi'
                    }
                  },
                  volumeMounts: [
                    {
                      mountPath: '/var/lib/chronograf',
                      name: 'chronograf-data'
                    }
                  ]
                }
              ]
            }
          },
          volumeClaimTemplates: [
            {
              metadata: {
                name: 'chronograf-data',
                namespace: 'data'
              },
              spec: {
                accessModes: [
                  'ReadWriteOnce'
                ],
                resources: {
                  requests: {
                    storage: '2Gi'
                  }
                }
              }
            }
          ]
        }
      },
      fqn: 'chronograf.data',
      name: 'chronograf',
      namespace: 'data',
      order: 50,
      scale: {
        small: '+0'
      },
      services: [
        {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            labels: {
              app: 'chrono'
            },
            name: 'chrono',
            namespace: 'data'
          },
          spec: {
            ports: [
              {
                name: 'http',
                port: 8888,
                protocol: 'TCP',
                targetPort: 8888
              }
            ],
            selector: {
              app: 'chronograf'
            },
            clusterIP: 'None'
          }
        },
        {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            labels: {
              app: 'chronograf'
            },
            name: 'chronograf',
            namespace: 'data'
          },
          spec: {
            ports: [
              {
                name: 'http',
                port: 8888,
                protocol: 'TCP',
                targetPort: 8888
              }
            ],
            selector: {
              app: 'chronograf'
            }
          }
        }
      ]
    },
    'heapster.kube-system': {
      account: {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: {
          name: 'heapster',
          namespace: 'kube-system'
        }
      },
      role: {
        apiVersion: 'rbac.authorization.k8s.io/v1beta1',
        kind: 'ClusterRole',
        metadata: {
          name: 'system:heapster'
        }
      },
      deployment: {
        apiVersion: 'apps/v1beta1',
        kind: 'Deployment',
        metadata: {
          name: 'heapster',
          namespace: 'kube-system'
        },
        spec: {
          replicas: 1,
          revisionHistoryLimit: 1,
          strategy: {
            rollingUpdate: {
              maxUnavailable: 1,
              maxSurge: 1
            }
          },
          selector: {
            matchLabels: {
              app: 'heapster'
            }
          },
          template: {
            metadata: {
              labels: {
                app: 'heapster',
                'k8s-app': 'heapster',
                task: 'monitoring'
              }
            },
            serviceAccountName: 'heapster',
            spec: {
              containers: [
                {
                  command: [
                    '/heapster',
                    '--source=kubernetes:https://kubernetes.default',
                    '--sink=influxdb:http://influxdb.data:8086'
                  ],
                  image: 'gcr.io/google_containers/heapster-amd64:v1.3.0',
                  name: 'heapster',
                  resources: {
                    limits: {
                      cpu: '200m',
                      memory: '200Mi'
                    },
                    requests: {
                      cpu: '100m',
                      memory: '50Mi'
                    }
                  }
                }
              ]
            }
          }
        }
      },
      fqn: 'heapster.kube-system',
      name: 'heapster',
      namespace: 'kube-system',
      order: 0,
      roleBinding: {
        apiVersion: 'rbac.authorization.k8s.io/v1beta1',
        kind: 'ClusterRoleBinding',
        metadata: {
          name: 'heapster'
        },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'system:heapster'
        },
        subjects: [
          {
            kind: 'ServiceAccount',
            name: 'heapster',
            namespace: 'kube-system'
          }
        ]
      },
      scale: {
        large: '+2',
        medium: '+1',
        small: '+0'
      }
    },
    'influxdb.data': {
      statefulSet: {
        apiVersion: 'apps/v1beta1',
        kind: 'StatefulSet',
        metadata: {
          name: 'influxdb',
          namespace: 'data'
        },
        spec: {
          replicas: 1,
          revisionHistoryLimit: 1,
          updateStrategy: {
            type: 'RollingUpdate'
          },
          serviceName: 'influx',
          selector: {
            matchLabels: {
              app: 'influxdb'
            }
          },
          template: {
            metadata: {
              labels: {
                app: 'influxdb'
              }
            },
            spec: {
              containers: [
                {
                  env: [
                    {
                      name: 'INFLUXDB_GRAPHITE_ENABLED',
                      value: 'false'
                    }
                  ],
                  image: 'influxdb:1.3-alpine',
                  name: 'influxdb',
                  ports: [
                    {
                      containerPort: 8086,
                      name: 'http',
                      protocol: 'TCP'
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: '200m',
                      memory: '200Mi'
                    },
                    requests: {
                      cpu: '100m',
                      memory: '50Mi'
                    }
                  },
                  volumeMounts: [
                    {
                      mountPath: '/var/lib/influxdb',
                      name: 'influx-data'
                    }
                  ]
                }
              ]
            }
          },
          volumeClaimTemplates: [
            {
              metadata: {
                name: 'influx-data',
                namespace: 'data'
              },
              spec: {
                accessModes: [
                  'ReadWriteOnce'
                ],
                resources: {
                  requests: {
                    storage: '20Gi'
                  }
                }
              }
            }
          ]
        }
      },
      fqn: 'influxdb.data',
      name: 'influxdb',
      namespace: 'data',
      order: 50,
      scale: {
        small: '+0'
      },
      services: [
        {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            labels: {
              app: 'influx'
            },
            name: 'influx',
            namespace: 'data'
          },
          spec: {
            ports: [
              {
                name: 'http',
                port: 8086,
                protocol: 'TCP',
                targetPort: 8086
              }
            ],
            selector: {
              app: 'influxdb'
            },
            clusterIP: 'None'
          }
        },
        {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            labels: {
              app: 'influxdb'
            },
            name: 'influxdb',
            namespace: 'data'
          },
          spec: {
            ports: [
              {
                name: 'http',
                port: 8086,
                protocol: 'TCP',
                targetPort: 8086
              }
            ],
            selector: {
              app: 'influxdb'
            }
          }
        }
      ]
    },
    'kapacitor.data': {
      statefulSet: {
        apiVersion: 'apps/v1beta1',
        kind: 'StatefulSet',
        metadata: {
          name: 'kapacitor',
          namespace: 'data'
        },
        spec: {
          replicas: 1,
          revisionHistoryLimit: 1,
          updateStrategy: {
            type: 'RollingUpdate'
          },
          serviceName: 'kapacitor',
          selector: {
            matchLabels: {
              app: 'kapacitor'
            }
          },
          template: {
            metadata: {
              labels: {
                app: 'kapacitor'
              }
            },
            spec: {
              containers: [
                {
                  env: [
                    {
                      name: 'KAPACITOR_INFLUXDB_0_URLS_0',
                      value: 'http://influxdb:8086'
                    }
                  ],
                  image: 'kapacitor:1.3-alpine',
                  name: 'kapacitor',
                  ports: [
                    {
                      containerPort: 9092,
                      name: 'http',
                      protocol: 'TCP'
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: '200m',
                      memory: '200Mi'
                    },
                    requests: {
                      cpu: '100m',
                      memory: '50Mi'
                    }
                  },
                  volumeMounts: [
                    {
                      mountPath: '/var/lib/kapacitor',
                      name: 'kapacitor-data'
                    }
                  ]
                }
              ]
            }
          },
          volumeClaimTemplates: [
            {
              metadata: {
                name: 'kapacitor-data',
                namespace: 'data'
              },
              spec: {
                accessModes: [
                  'ReadWriteOnce'
                ],
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
      fqn: 'kapacitor.data',
      name: 'kapacitor',
      namespace: 'data',
      order: 50,
      scale: {
        small: '+0'
      },
      services: [
        {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            labels: {
              app: 'kapacitor'
            },
            name: 'kapacitor',
            namespace: 'data'
          },
          spec: {
            ports: [
              {
                name: 'http',
                port: 9092,
                protocol: 'TCP',
                targetPort: 9092
              }
            ],
            selector: {
              app: 'kapacitor'
            },
            clusterIP: 'None'
          }
        }
      ]
    },
    'create-cert.infra': {
      'name': 'create-cert',
      'namespace': 'infra',
      'fqn': 'create-cert.infra',
      'order': 10,
      'job': {
        'apiVersion': 'batch/v1',
        'kind': 'Job',
        'metadata': {
          'name': 'create-cert',
          'namespace': 'infra'
        },
        'spec': {
          'completions': 1,
          'parallelism': 1,
          'template': {
            'metadata': {
              'labels': {
                'app': 'create-cert'
              }
            },
            'spec': {
              'backoffLimit': 4,
              'containers': [
                {
                  'command': [ '/etc/create-cert/create-cert.sh' ],
                  'env': [
                    {
                      'name': 'DOMAINS',
                      'value': '*.test.com'
                    },
                    {
                      'name': 'EMAIL',
                      'value': 'me@test.com'
                    },
                    {
                      'name': 'NAMESPACE',
                      'value': 'infra'
                    },
                    {
                      'name': 'SECRET',
                      'value': 'ssl'
                    },
                    {
                      'name': 'COUNTRY',
                      'value': 'US'
                    },
                    {
                      'name': 'STATE',
                      'value': 'Tennessee'
                    },
                    {
                      'name': 'LOCAL',
                      'value': 'Murfreesboro'
                    },
                    {
                      'name': 'ORGANIZATION',
                      'value': 'OSS'
                    },
                    {
                      'name': 'UNIT',
                      'value': 'Software'
                    },
                    {
                      'name': 'FQN',
                      'value': '*.test.com'
                    }
                  ],
                  'image': 'arobson/alpine-util:latest',
                  'name': 'create-cert',
                  'resources': {
                    'limits': {
                      'cpu': '200m',
                      'memory': '200Mi'
                    },
                    'requests': {
                      'cpu': '100m',
                      'memory': '50Mi'
                    }
                  },
                  'securityContext': {
                    'allowPrivilegeEscalation': true,
                    'capabilities': [ 'NET_ADMIN', 'SYS_TIME' ],
                    'runAsUser': 1000,
                    'fsGroup': 1000
                  },
                  'volumeMounts': [
                    {
                      'mountPath': '/etc/create-cert',
                      'name': 'files'
                    }
                  ]
                }
              ],
              'restartPolicy': 'Never',
              'volumes': [
                {
                  'configMap': {
                    'items': [
                      {
                        'key': 'create-cert.sh',
                        'path': 'create-cert.sh'
                      },
                      {
                        'key': 'secret-template.json',
                        'path': 'secret-template.json'
                      }
                    ],
                    'name': 'self-sign-files'
                  },
                  'name': 'files'
                }
              ]
            }
          }
        }
      }
    },
    'proxy.infra': {
      fqn: 'proxy.infra',
      name: 'proxy',
      namespace: 'infra',
      order: 100,
      scale: {
        large: '+2',
        medium: '+1',
        small: '+0'
      },
      deployment: {
        apiVersion: 'apps/v1beta1',
        kind: 'Deployment',
        metadata: {
          name: 'proxy',
          namespace: 'infra'
        },
        spec: {
          replicas: 2,
          revisionHistoryLimit: 2,
          minReadySeconds: 10,
          progressDeadlineSeconds: 30,
          strategy: {
            rollingUpdate: {
              maxUnavailable: 1,
              maxSurge: '100%'
            }
          },
          selector: {
            matchLabels: {
              app: 'proxy'
            }
          },
          template: {
            metadata: {
              labels: {
                app: 'proxy'
              }
            },
            spec: {
              containers: [
                {
                  image: 'nginx:1.13-alpine',
                  name: 'proxy',
                  ports: [
                    {
                      containerPort: 80,
                      name: 'http',
                      protocol: 'TCP'
                    },
                    {
                      containerPort: 443,
                      name: 'https',
                      protocol: 'TCP'
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: '200m',
                      memory: '200Mi'
                    },
                    requests: {
                      cpu: '100m',
                      memory: '50Mi'
                    }
                  },
                  volumeMounts: [
                    {
                      mountPath: '/etc/nginx',
                      name: 'config-files'
                    },
                    {
                      mountPath: '/etc/nginx/cert',
                      name: 'cert-files'
                    }
                  ]
                }
              ],
              volumes: [
                {
                  name: 'config-files',
                  configMap: {
                    name: 'nginx-files',
                    items: [
                      {
                        key: 'nginx.conf',
                        path: 'nginx.conf'
                      },
                      {
                        key: 'mime.types',
                        path: 'mime.types'
                      }
                    ]
                  }
                },
                {
                  name: 'cert-files',
                  secret: {
                    secretName: 'ssl'
                  }
                }
              ]
            }
          }
        }
      },
      services: [
        {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            labels: {
              app: 'proxy'
            },
            name: 'proxy',
            namespace: 'infra'
          },
          spec: {
            ports: [
              {
                name: 'http',
                port: 80,
                targetPort: 80,
                protocol: 'TCP'
              },
              {
                name: 'https',
                port: 443,
                targetPort: 443,
                protocol: 'TCP'
              }
            ],
            selector: {
              app: 'proxy'
            },
            type: 'LoadBalancer'
          }
        }
      ]
    },
    'etcd-cluster.data': {
      'name': 'etcd-cluster',
      'namespace': 'data',
      'fqn': 'etcd-cluster.data',
      'cluster': {
        'apiVersion': 'etcd.coreos.com/v1beta1',
        'kind': 'Cluster',
        'metadata': {
          'name': 'etcd-cluster',
          'namespace': 'data'
        },
        'spec': {
          'size': 2,
          'version': '3.1.0'
        }
      }
    },
    'etcd-operator.data': {
      'fqn': 'etcd-operator.data',
      'name': 'etcd-operator',
      'namespace': 'data',
      'deployment': {
        'apiVersion': 'apps/v1beta1',
        'kind': 'Deployment',
        'metadata': {
          'namespace': 'data',
          'name': 'etcd-operator'
        },
        'spec': {
          'replicas': 1,
          'revisionHistoryLimit': 1,
          'strategy': {
            'rollingUpdate': {
              'maxUnavailable': 1,
              'maxSurge': 1
            }
          },
          selector: {
            matchLabels: {
              app: 'etcd-operator'
            }
          },
          'template': {
            'metadata': {
              'labels': {
                'app': 'etcd-operator'
              }
            },
            'spec': {
              'containers': [
                {
                  'name': 'etcd-operator',
                  'image': 'quay.io/coreos/etcd-operator:v0.2.1',
                  'env': [
                    {
                      'name': 'MY_POD_NAMESPACE',
                      'valueFrom': {
                        'fieldRef': {
                          'fieldPath': 'metadata.namespace'
                        }
                      }
                    },
                    {
                      'name': 'MY_POD_NAME',
                      'valueFrom': {
                        'fieldRef': {
                          'fieldPath': 'metadata.name'
                        }
                      }
                    }
                  ],
                  'resources': {
                    'requests': {
                      'memory': '50Mi',
                      'cpu': '100m'
                    },
                    'limits': {
                      'memory': '200Mi',
                      'cpu': '200m'
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
}
