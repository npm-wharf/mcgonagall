const path = require('path')
const fs = require('fs')
const _ = require('lodash')

const PIPELINE = fs.readFileSync(path.resolve('./spec/tokenized-source', 'elasticsearch-pipeline.conf'), 'utf8')
const FILEBEAT = fs.readFileSync(path.resolve('./spec/tokenized-source', 'filebeat.yml'), 'utf8')

module.exports = {
  'namespaces': [
    'infra'
  ],
  'services': {
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
              'app': 'es'
            }
          },
          'spec': {
            'selector': {
              'app': 'elasticsearch'
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
        'apiVersion': 'apps/v1beta1',
        'kind': 'Deployment',
        'metadata': {
          'namespace': 'infra',
          'name': 'elasticsearch'
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
          'template': {
            'metadata': {
              'labels': {
                'app': 'elasticsearch'
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
                  ],
                  'resources': {}
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
              'app': 'kibana'
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
        'apiVersion': 'apps/v1beta1',
        'kind': 'Deployment',
        'metadata': {
          'namespace': 'infra',
          'name': 'kibana'
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
          'template': {
            'metadata': {
              'labels': {
                'app': 'kibana'
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
                  ],
                  'resources': {}
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
              'app': 'logstash'
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
        'apiVersion': 'apps/v1beta1',
        'kind': 'Deployment',
        'metadata': {
          'namespace': 'infra',
          'name': 'logstash'
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
          'template': {
            'metadata': {
              'labels': {
                'app': 'logstash'
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
                  'resources': {},
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
        'apiVersion': 'apps/v1beta1',
        'kind': 'Deployment',
        'metadata': {
          'namespace': 'infra',
          'name': 'filebeat'
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
          'template': {
            'metadata': {
              'labels': {
                'app': 'filebeat'
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
                  'resources': {},
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
  'levels': [
    0,
    1
  ],
  'apiVersion': '1.7',
  'configuration': [
    {
      'apiVersion': 'v1',
      'kind': 'ConfigMap',
      'metadata': {
        'name': 'filebeat-config',
        'namespace': 'infra'
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
        'namespace': 'infra'
      },
      'data': {
        'elasticsearch-pipeline.conf': _.template(PIPELINE)({namespace: 'infra'})
      }
    }
  ]
}
