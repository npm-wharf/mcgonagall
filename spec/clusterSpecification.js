const path = require('path')
const fs = require('fs')

const MIME_TYPES = fs.readFileSync(path.resolve('./spec/source', 'mime.types'), 'utf8')
const NGINX_CONF = fs.readFileSync(path.resolve('./spec/', 'full-nginx.conf'), 'utf8')

module.exports = {
  configuration: [
    {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'nginx-files',
        namespace: 'infra',
      },
      data: {
        'mime.types': MIME_TYPES,
        'nginx.conf': NGINX_CONF
      }
    }
  ],
  levels: [0, 1, 2],
  namespaces: [
    "kube-system",
    "data",
    "infra",
  ],
  order: {
    0: [
      "heapster.kube-system"
    ],
    1: [
      "chronograf.data",
      "influxdb.data",
      "kapacitor.data",
    ],
    2: [
      "proxy.infra"
    ]
  },
  services: {
    "chronograf.data": {
      statefulSet: {
        apiVersion: "apps/v1beta",
        kind: "StatefulSet",
        metadata: {
          name: "chronograf",
          namespace: "data",
        },
        spec: {
          replicas: 1,
          revisionHistoryLimit: 1,
          serviceName: "chrono",
          template: {
            metadata: {
              labels: {
                app: "chronograf"
              }
            },
            spec: {
              containers: [
                {
                  env: [
                    {
                      name: "INFLUXDB_URL",
                      value: "http://influxdb:8086"
                    },
                    {
                      name: "KAPACITOR_URL",
                      value: "http://kapacitor:9092"
                    }
                  ],
                  image: "quay.io/influxdb/chronograf:1.3.5.0",
                  name: "chronograf",
                  ports: [
                    {
                      containerPort: 8888,
                      name: "http",
                      protocol: "TCP"
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: 0.2,
                      memory: "200Mi"
                    },
                    requests: {
                      cpu: 0.1,
                      memory: "50Mi"
                    }
                  },
                  volumeMounts: [
                    {
                      mountPath: "/var/lib/chronograf",
                      name: "chronograf-data"
                    }
                  ]
                }
              ]
            },
            volumeClaimTemplates: [
              {
                metadata: {
                  name: "chronograf-data",
                  namespace: "data"
                },
                spec: {
                  accessModes: [
                    "ReadWriteOnce"
                  ],
                  resources: {
                    requests: {
                      storage: "2Gi"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      fqn: "chronograf.data",
      name: "chronograf",
      namespace: "data",
      order: 1,
      scale: {
        small: "+0"
      },
      services: [
        {
          apiVersion: "v1",
          kind: "Service",
          metadata: {
            labels: {
              app: "chrono"
            },
            name: "chrono",
            namespace: "data"
          },
          spec: {
            ports: [
              {
                name: "http",
                port: 8888,
                protocol: "TCP",
                targetPort: 8888
              }
            ],
            selector: {
              app: "chronograf"
            },
            clusterIP: "None"
          }
        },
        {
          apiVersion: "v1",
          kind: "Service",
          metadata: {
            labels: {
              app: "chronograf"
            },
            name: "chronograf",
            namespace: "data"
          },
          spec: {
            ports: [
              {
                name: "http",
                port: 8888,
                protocol: "TCP",
                targetPort: 8888
              }
            ],
            selector: {
              app: "chronograf"
            }
          }
        }
      ]
    },
    "heapster.kube-system": {
      account: {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: "heapster",
          namespace: "kube-system"
        }
      },
      deployment: {
        apiVersion: "apps/v1beta",
        kind: "Deployment",
        metadata: {
          name: "heapster",
          namespace: "kube-system"
        },
        spec: {
          replicas: 1,
          revisionHistoryLimit: 1,
          template: {
            metadata: {
              labels: {
                app: "heapster",
                "k8s-app": "heapster",
                task: "monitoring"
              }
            },
            "spec": {
              "containers": [
                {
                  "command": [
                    "/heapster",
                    "--source=kubernetes:https://kubernetes.default",
                    "--sink=influxdb:http://influxdb.data:8086"
                  ],
                  env: [],
                  image: "gcr.io/google_containers/heapster-amd64:v1.3.0",
                  name: "heapster",
                  ports: [],
                  resources: {
                    limits: {
                      cpu: 0.2,
                      memory: "200Mi"
                    },
                    requests: {
                      cpu: 0.1,
                      memory: "50Mi"
                    }
                  }
                }
              ]
            }
          }
        }
      },
      fqn: "heapster.kube-system",
      name: "heapster",
      namespace: "kube-system",
      order: 0,
      roleBinding: {
        apiVersion: "rbac.authorization.k8s.io/v1beta1",
        kind: "ClusterRoleBinding",
        metadata: {
          name: "heapster",
        },
        roleRef: {
          apiGroup: "rba.authorization.k8s.io",
          kind: "ClusterRole",
          name: "system:heapster"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "heapster",
            namespace: "kube-system"
          }
        ]
      },
      scale: {
        large: "+2",
        medium: "+1",
        small: "+0"
      }
    },
    "influxdb.data": {
      statefulSet: {
        apiVersion: "apps/v1beta",
        kind: "StatefulSet",
        metadata: {
          name: "influxdb",
          namespace: "data",
        },
        spec: {
          replicas: 1,
          revisionHistoryLimit: 1,
          serviceName: "influx",
          template: {
            metadata: {
              labels: {
                app: "influxdb"
              }
            },
            spec: {
              containers: [
                {
                  env: [
                    {
                      name: "INFLUXDB_GRAPHITE_ENABLED",
                      value: "false"
                    }
                  ],
                  image: "influxdb:1.3-alpine",
                  name: "influxdb",
                  ports: [
                    {
                      containerPort: 8086,
                      name: "http",
                      protocol: "TCP"
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: 0.2,
                      memory: "200Mi"
                    },
                    requests: {
                      cpu: 0.1,
                      memory: "50Mi"
                    }
                  },
                  volumeMounts: [
                    {
                      mountPath: "/var/lib/influxdb",
                      name: "influx-data"
                    }
                  ]
                }
              ]
            },
            volumeClaimTemplates: [
              {
                metadata: {
                  name: "influx-data",
                  namespace: "data"
                },
                spec: {
                  accessModes: [
                    "ReadWriteOnce"
                  ],
                  resources: {
                    requests: {
                      storage: "20Gi"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      fqn: "influxdb.data",
      name: "influxdb",
      namespace: "data",
      order: 1,
      scale: {
        small: "+0"
      },
      services: [
        {
          apiVersion: "v1",
          kind: "Service",
          metadata: {
            labels: {
              app: "influx"
            },
            name: "influx",
            namespace: "data"
          },
          spec: {
            ports: [
              {
                name: "http",
                port: 8086,
                protocol: "TCP",
                targetPort: 8086
              }
            ],
            selector: {
              app: "influxdb",
            },
            clusterIP: "None"
          }
        },
        {
          apiVersion: "v1",
          kind: "Service",
          metadata: {
            labels: {
              app: "influxdb"
            },
            name: "influxdb",
            namespace: "data"
          },
          spec: {
            ports: [
              {
                name: "http",
                port: 8086,
                protocol: "TCP",
                targetPort: 8086
              }
            ],
            selector: {
              app: "influxdb",
            }
          }
        }
      ]
    },
    "kapacitor.data": {
      statefulSet: {
        apiVersion: "apps/v1beta",
        kind: "StatefulSet",
        metadata: {
          name: "kapacitor",
          namespace: "data"
        },
        spec: {
          replicas: 1,
          revisionHistoryLimit: 1,
          serviceName: "kapacitor",
          template: {
            metadata: {
              labels: {
                app: "kapacitor"
              }
            },
            spec: {
              containers: [
                {
                  env: [
                    {
                      name: "KAPACITOR_INFLUXDB_0_URLS_0",
                      value: "http://influxdb:8086"
                    }
                  ],
                  image: "kapacitor:1.3-alpine",
                  name: "kapacitor",
                  ports: [
                    {
                      containerPort: 9092,
                      name: "http",
                      protocol: "TCP"
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: 0.2,
                      memory: "200Mi"
                    },
                    requests: {
                      cpu: 0.1,
                      memory: "50Mi"
                    }
                  },
                  volumeMounts: [
                    {
                      mountPath: "/var/lib/kapacitor",
                      name: "kapacitor-data"
                    }
                  ]
                }
              ]
            },
            volumeClaimTemplates: [
              {
                metadata: {
                  name: "kapacitor-data",
                  namespace: "data"
                },
                spec: {
                  accessModes: [
                    "ReadWriteOnce"
                  ],
                  resources: {
                    requests: {
                      storage: "10Gi"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      fqn: "kapacitor.data",
      name: "kapacitor",
      namespace: "data",
      order: 1,
      scale: {
        small: "+0"
      },
      services: [
        {
          apiVersion: "v1",
          kind: "Service",
          metadata: {
            labels: {
              app: "kapacitor"
            },
            name: "kapacitor",
            namespace: "data"
          },
          spec: {
            ports: [
              {
                name: "http",
                port: 9092,
                protocol: "TCP",
                targetPort: 9092
              }
            ],
            selector: {
              app: "kapacitor"
            },
            clusterIP: "None"
          }
        },
        {
          apiVersion: "v1",
          kind: "Service",
          metadata: {
            labels: {
              app: "kapacitor"
            },
            name: "kapacitor",
            namespace: "data"
          },
          spec: {
            ports: [
              {
                name: "http",
                port: 9092,
                protocol: "TCP",
                targetPort: 9092
              }
            ],
            selector: {
              app: "kapacitor"
            }
          }
        }
      ]
    },
    "proxy.infra": {
      fqn: "proxy.infra",
      name: "proxy",
      namespace: "infra",
      order: 2,
      scale: {
        large: "+2",
        medium: "+1",
        small: "+0"
      },
      deployment: {
        apiVersion: "apps/v1beta",
        kind: "Deployment",
        metadata: {
          name: "proxy",
          namespace: "infra"
        },
        spec: {
          replicas: 2,
          revisionHistoryLimit: 1,
          template: {
            metadata: {
              labels: {
                app: "proxy"
              }
            },
            spec: {
              containers: [
                {
                  env: [],
                  image: "nginx:1.13-alpine",
                  name: "proxy",
                  ports: [
                    {
                      containerPort: 80,
                      name: "http",
                      protocol: "TCP"
                    },
                    {
                      containerPort: 443,
                      name: "https",
                      protocol: "TCP"
                    }
                  ],
                  resources: {
                    limits: {
                      cpu: 0.2,
                      memory: "200Mi"
                    },
                    requests: {
                      cpu: 0.1,
                      memory: "50Mi"
                    }
                  },
                  volumeMounts: [
                    {
                      mountPath: "/etc/nginx",
                      name: "config-files"
                    },
                    {
                      mountPath: "/etc/nginx/cache",
                      name: "nginx-cache"
                    }
                  ]
                }
              ],
              volumes: [
                {
                  name: "config-files",
                  configMap: {
                    name: "nginx-files",
                    items: [
                      {
                        key: "nginx.conf",
                        path: "nginx.conf"
                      },
                      {
                        key: "mime.types",
                        path: "mime.types"
                      }
                    ]
                  }
                }
              ]
            },
            volumeClaimTemplates: [
              {
                metadata: {
                  name: "nginx-cache",
                  namespace: "infra"
                },
                spec: {
                  accessModes: [ "ReadWriteOnce" ],
                  resources: {
                    requests: {
                      storage: "20Gi"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      services: [
        {
          apiVersion: "v1",
          kind: "Service",
          metadata: {
            labels: {
              app: "proxy"
            },
            name: "proxy",
            namespace: "infra"
          },
          spec: {
            ports: [
              {
                name: "http",
                port: 80,
                targetPort: 80,
                protocol: "TCP"
              },
              {
                name: "https",
                port: 443,
                targetPort: 443,
                protocol: "TCP"
              }
            ],
            selector: {
              app: "proxy"
            },
            type: "LoadBalancer"
          }
        }
      ]
    }
  }
}
