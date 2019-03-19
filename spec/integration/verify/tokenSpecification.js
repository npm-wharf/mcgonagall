const _ = require('lodash')
const path = require('path')
const fs = require('fs')

const PIPELINE = fs.readFileSync(path.resolve('./spec/integration/source/tokenized-source', 'elasticsearch-pipeline.conf'), 'utf8')
const FILEBEAT = fs.readFileSync(path.resolve('./spec/integration/source/tokenized-source', 'filebeat.yml'), 'utf8')

module.exports = {
  'namespaces': [
    'infra'
  ],
  'resources': {
    'elasticsearch.infra': {
      'order': 0,
      'name': 'elasticsearch',
      'namespace': 'infra',
      'fqn': 'elasticsearch.infra',
      'services': [
        {
          'apiVersion': 'v1',
          'kind': 'Service',
          'metadata': {
            'namespace': 'infra',
            'name': 'es',
            'labels': {
              'app': 'es',
              'name': 'es',
              'namespace': 'infra'
            }
          },
          'spec': {
            'selector': {
              'app': 'es'
            },
            'ports': [
              {
                'name': 'primary',
                'port': 9200,
                'targetPort': 9200,
                'protocol': 'TCP'
              },
              {
                'name': 'secondary',
                'port': 9200,
                'targetPort': 9200,
                'protocol': 'TCP'
              }
            ]
          }
        }
      ],
      'deployment': {
        'apiVersion': 'apps/v1',
        'kind': 'Deployment',
        'metadata': {
          'namespace': 'infra',
          'name': 'elasticsearch',
          'labels': {
            'name': 'elasticsearch',
            'namespace': 'infra'
          }
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
          'selector': {
            'matchLabels': {
              'app': 'es'
            }
          },
          'template': {
            'metadata': {
              'labels': {
                'app': 'es',
                'name': 'elasticsearch',
                'namespace': 'infra'
              }
            },
            'spec': {
              'containers': [
                {
                  'name': 'elasticsearch',
                  'image': 'elasticsearch:5.5.1-alpine',
                  'env': [
                    {
                      'name': 'NETWORK_HOST',
                      'value': '0.0.0.0'
                    }
                  ],
                  'ports': [
                    {
                      'name': 'primary',
                      'containerPort': 9200,
                      'protocol': 'TCP'
                    },
                    {
                      'name': 'secondary',
                      'containerPort': 9200,
                      'protocol': 'TCP'
                    }
                  ]
                }
              ]
            }
          }
        }
      }
    },
    'kibana.infra': {
      'order': 1,
      'name': 'kibana',
      'namespace': 'infra',
      'fqn': 'kibana.infra',
      'services': [
        {
          'apiVersion': 'v1',
          'kind': 'Service',
          'metadata': {
            'namespace': 'infra',
            'name': 'kibana',
            'labels': {
              'app': 'kibana',
              'name': 'kibana',
              'namespace': 'infra'
            }
          },
          'spec': {
            'selector': {
              'app': 'kibana'
            },
            'ports': [
              {
                'name': 'kibana',
                'port': 5601,
                'targetPort': 5601,
                'protocol': 'TCP'
              }
            ]
          }
        }
      ],
      'deployment': {
        'apiVersion': 'apps/v1',
        'kind': 'Deployment',
        'metadata': {
          'namespace': 'infra',
          'name': 'kibana',
          'labels': {
            'name': 'kibana',
            'namespace': 'infra'
          }
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
          'selector': {
            'matchLabels': {
              'app': 'kibana'
            }
          },
          'template': {
            'metadata': {
              'labels': {
                'app': 'kibana',
                'name': 'kibana',
                'namespace': 'infra'
              }
            },
            'spec': {
              'containers': [
                {
                  'name': 'kibana',
                  'image': 'kibana:5.5.1',
                  'env': [
                    {
                      'name': 'SERVER_NAME',
                      'value': 'logs.test.com'
                    },
                    {
                      'name': 'ELASTICSEARCH_URL',
                      'value': 'http://elasticsearch.infra:9200'
                    }
                  ],
                  'ports': [
                    {
                      'name': 'kibana',
                      'containerPort': 5601,
                      'protocol': 'TCP'
                    }
                  ]
                }
              ]
            }
          }
        }
      }
    },
    'logstash.infra': {
      'order': 1,
      'name': 'logstash',
      'namespace': 'infra',
      'fqn': 'logstash.infra',
      'services': [
        {
          'apiVersion': 'v1',
          'kind': 'Service',
          'metadata': {
            'namespace': 'infra',
            'name': 'logstash',
            'labels': {
              'app': 'logstash',
              'name': 'logstash',
              'namespace': 'infra'
            }
          },
          'spec': {
            'selector': {
              'app': 'logstash'
            },
            'ports': [
              {
                'name': 'logstash',
                'port': 5044,
                'targetPort': 5044,
                'protocol': 'TCP'
              }
            ]
          }
        }
      ],
      'deployment': {
        'apiVersion': 'apps/v1',
        'kind': 'Deployment',
        'metadata': {
          'namespace': 'infra',
          'name': 'logstash',
          'labels': {
            'name': 'logstash',
            'namespace': 'infra'
          }
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
          'selector': {
            'matchLabels': {
              'app': 'logstash'
            }
          },
          'template': {
            'metadata': {
              'labels': {
                'app': 'logstash',
                'name': 'logstash',
                'namespace': 'infra'
              }
            },
            'spec': {
              'containers': [
                {
                  'name': 'logstash',
                  'image': 'docker.elastic.co/logstash/logstash:5.5.1',
                  'env': [
                    {
                      'name': 'SERVER_NAME',
                      'value': 'logs.test.com'
                    },
                    {
                      'name': 'ELASTICSEARCH_URL',
                      'value': 'http://elasticsearch.infra:9200'
                    }
                  ],
                  'ports': [
                    {
                      'name': 'logstash',
                      'containerPort': 5044,
                      'protocol': 'TCP'
                    }
                  ],
                  'command': [
                    'logstash',
                    '-f',
                    '/usr/share/logstash/pipeline/elasticsearch-pipeline.conf'
                  ],
                  'volumeMounts': [
                    {
                      'name': 'config',
                      'mountPath': '/usr/share/logstash/pipeline/'
                    }
                  ]
                }
              ],
              'volumes': [
                {
                  'name': 'config',
                  'configMap': {
                    'name': 'logstash-config',
                    'items': [
                      {
                        'key': 'elasticsearch-pipeline.conf',
                        'path': 'elasticsearch-pipeline.conf'
                      }
                    ]
                  }
                }
              ]
            }
          }
        }
      }
    },
    'filebeat.infra': {
      'order': 1,
      'name': 'filebeat',
      'namespace': 'infra',
      'fqn': 'filebeat.infra',
      'deployment': {
        'apiVersion': 'apps/v1',
        'kind': 'Deployment',
        'metadata': {
          'namespace': 'infra',
          'name': 'filebeat',
          'labels': {
            'name': 'filebeat',
            'namespace': 'infra'
          }
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
          'selector': {
            'matchLabels': {
              'app': 'filebeat'
            }
          },
          'template': {
            'metadata': {
              'labels': {
                'app': 'filebeat',
                'name': 'filebeat',
                'namespace': 'infra'
              }
            },
            'spec': {
              'containers': [
                {
                  'name': 'filebeat',
                  'image': 'prima/filebeat:5.5.1',
                  'env': [
                    {
                      'name': 'LOGSTASH_HOSTS',
                      'value': 'logstash:5044'
                    },
                    {
                      'name': 'LOG_LEVEL',
                      'value': 'info'
                    },
                    {
                      'name': 'FILEBEAT_HOST',
                      'valueFrom': {
                        'fieldRef': {
                          'fieldPath': 'spec.nodeName'
                        }
                      }
                    }
                  ],
                  'command': [
                    'filebeat',
                    '-e',
                    '-c',
                    '/etc/filebeat/filebeat.yml'
                  ],
                  'volumeMounts': [
                    {
                      'name': 'config',
                      'mountPath': '/etc/filebeat'
                    },
                    {
                      'name': 'varlog',
                      'mountPath': '/var/log/containers'
                    },
                    {
                      'name': 'varlogpods',
                      'mountPath': '/var/log/pods'
                    },
                    {
                      'name': 'varlibdocker',
                      'mountPath': '/var/lib/docker/containers'
                    }
                  ]
                }
              ],
              'volumes': [
                {
                  'name': 'config',
                  'configMap': {
                    'name': 'filebeat-config',
                    'items': [
                      {
                        'key': 'filebeat.yml',
                        'path': 'filebeat.yml'
                      }
                    ]
                  }
                },
                {
                  'name': 'varlog',
                  'hostPath': {
                    'path': '/var/log/containers',
                    'type': 'Directory'
                  }
                },
                {
                  'name': 'varlogpods',
                  'hostPath': {
                    'path': '/var/log/pods',
                    'type': 'Directory'
                  }
                },
                {
                  'name': 'varlibdocker',
                  'hostPath': {
                    'path': '/var/lib/docker/containers',
                    'type': 'Directory'
                  }
                }
              ]
            }
          }
        }
      }
    },
    'proxy.infra': {
      'fqn': 'proxy.infra',
      'name': 'proxy',
      'namespace': 'infra',
      'services': [
        {
          'apiVersion': 'v1',
          'kind': 'Service',
          'metadata': {
            'namespace': 'infra',
            'name': 'proxy',
            'labels': {
              'app': 'proxy',
              'name': 'proxy',
              'namespace': 'infra'
            }
          },
          'spec': {
            'selector': {
              'app': 'proxy'
            },
            'ports': [
              {
                'name': 'http',
                'port': 80,
                'targetPort': 80,
                'protocol': 'TCP'
              },
              {
                'name': 'https',
                'port': 443,
                'targetPort': 443,
                'protocol': 'TCP'
              }
            ],
            'type': 'LoadBalancer'
          }
        }
      ],
      'deployment': {
        'apiVersion': 'apps/v1',
        'kind': 'Deployment',
        'metadata': {
          'namespace': 'infra',
          'name': 'proxy',
          'labels': {
            'name': 'proxy',
            'namespace': 'infra'
          }
        },
        'spec': {
          'replicas': 2,
          'revisionHistoryLimit': 2,
          'strategy': {
            'rollingUpdate': {
              'maxUnavailable': 1,
              'maxSurge': '100%'
            }
          },
          'selector': {
            'matchLabels': {
              'app': 'proxy'
            }
          },
          'template': {
            'metadata': {
              'labels': {
                'app': 'proxy',
                'name': 'proxy',
                'namespace': 'infra'
              }
            },
            'spec': {
              'containers': [
                {
                  'name': 'proxy',
                  'image': 'nginx:1.13-alpine',
                  'ports': [
                    {
                      'name': 'http',
                      'containerPort': 80,
                      'protocol': 'TCP'
                    },
                    {
                      'name': 'https',
                      'containerPort': 443,
                      'protocol': 'TCP'
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
                  },
                  'volumeMounts': [
                    {
                      'name': 'config-files',
                      'mountPath': '/etc/nginx'
                    },
                    {
                      'name': 'cert-files',
                      'mountPath': '/etc/nginx/cert'
                    },
                    {
                      'name': 'auth-files',
                      'mountPath': '/etc/nginx/auth'
                    }
                  ]
                }
              ],
              'volumes': [
                {
                  'name': 'config-files',
                  'configMap': {
                    'name': 'nginx-files',
                    'items': [
                      {
                        'key': 'nginx.conf',
                        'path': 'nginx.conf'
                      }
                    ]
                  }
                },
                {
                  'name': 'cert-files',
                  'secret': {
                    'secretName': 'ssl'
                  }
                },
                {
                  'name': 'auth-files',
                  'configMap': {
                    'name': 'auth-file',
                    'items': [
                      {
                        'key': 'htpasswd',
                        'path': 'htpasswd'
                      }
                    ]
                  }
                }
              ]
            }
          },
          'progressDeadlineSeconds': 30,
          'minReadySeconds': 10
        }
      }
    }
  },
  'order': {
    '0': [
      'elasticsearch.infra'
    ],
    '1': [
      'kibana.infra',
      'logstash.infra',
      'filebeat.infra'
    ]
  },
  'imagePullSecrets': {},
  'levels': [
    0,
    1
  ],
  'apiVersion': '1.9',
  'configuration': [
    {
      'apiVersion': 'v1',
      'kind': 'ConfigMap',
      'metadata': {
        'name': 'filebeat-config',
        'namespace': 'infra',
        labels: {
          'name': 'filebeat-config',
          'namespace': 'infra'
        }
      },
      'data': {
        'filebeat.yml': FILEBEAT
      }
    },
    {
      'apiVersion': 'v1',
      'kind': 'ConfigMap',
      'metadata': {
        'name': 'logstash-config',
        'namespace': 'infra',
        labels: {
          'name': 'logstash-config',
          'namespace': 'infra'
        }
      },
      'data': {
        'elasticsearch-pipeline.conf': _.template(PIPELINE)({ namespace: 'infra' })
      }
    },
    {
      'apiVersion': 'v1',
      'kind': 'ConfigMap',
      'metadata': {
        'name': 'nginx-files',
        'namespace': 'infra',
        labels: {
          'name': 'nginx-files',
          'namespace': 'infra'
        }
      },
      'data': {
        'nginx.conf': 'events {\n  worker_connections  1024;\n}\n\nhttp {\n  sendfile    on;\n  tcp_nopush  on;\n  tcp_nodelay on;\n\n  keepalive_timeout     60;\n  types_hash_max_size   2048;\n  client_max_body_size  100m;\n\n  include       mime.types;\n  default_type  application/octet-stream;\n  access_log    /var/log/nginx/access.log;\n  error_log     /var/log/nginx/error.log;\n\n  gzip                on;\n  gzip_vary           on;\n  gzip_proxied        any;\n  gzip_comp_level     6;\n  gzip_buffers 16     8k;\n  gzip_http_version   1.1;\n  gzip_types          text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript;\n\n  upstream k8s {\n    server kubernetes-dashboard.kube-system:80;\n  }\n\n    server {\n      listen    443 ssl;\n      listen    [::]:443 ssl;\n      root      /usr/share/nginx/html;\n\n      ssl on;\n      ssl_certificate       "/etc/nginx/cert/cert.pem";\n      ssl_certificate_key   "/etc/nginx/cert/cert.pem";\n\n      ssl_session_cache shared:SSL:1m;\n      ssl_session_timeout 10m;\n      ssl_protocols TLSv1 TLSv1.1 TLSv1.2;\n      ssl_ciphers HIGH:SEED:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!RSAPSK:!aDH:!aECDH:!EDH-DSS-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA:!SRP;\n      ssl_prefer_server_ciphers on;\n\n      auth_basic           "authorization required";\n      auth_basic_user_file /etc/nginx/auth/htpasswd;\n\n      server_name   ~^logs[.].*$;\n\n      location / {\n        resolver            kube-dns.kube-system valid=1s;\n        set $server         kibana.infra.svc.cluster.local:5601;\n        rewrite             ^/(.*) /$1 break;\n        proxy_pass          http://$server;\n        proxy_set_header    Host $host;\n        proxy_set_header    X-Real-IP $remote_addr;\n        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header    X-Forwarded-Proto $scheme;\n      }\n    }\n\n}\n'
      }
    },
    {
      'apiVersion': 'v1',
      'kind': 'ConfigMap',
      'metadata': {
        'name': 'auth-file',
        'namespace': 'infra',
        labels: {
          'name': 'auth-file',
          'namespace': 'infra'
        }
      },
      'data': {
        'htpasswd': 'admin:$2a$10$Gc0JyHlN.yqqdHw8.yhUZu.6WSpyV0uoT5sMMEt8HSynupsDO6tbe\n'
      }
    }
  ],
  secrets: [],
  contentHash: 'o9c0ZIEsBsXNxiGdQbnpgeNfKrELsUlhIzuNx2OoaVY=',
  dataHash: 'e+iGfQUlx3uDxvYQj+BunSTFAPv6wbyuaep5uBqUhQI='
}
