module.exports = {
  fqn: "dbadmin.data",
  name: "dbadmin",
  namespace: "data",
  account: {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      name: 'dbowner',
      namespace: 'data'
    }
  },
  roleBinding: {
    apiVersion: 'rbac.authorization.k8s.io/v1beta1',
    kind: 'ClusterRoleBinding',
    metadata: {
      name: 'dbowner',
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'ClusterRole',
      name: 'system:dbowner'
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: 'dbowner',
        namespace: 'data'
      }
    ]
  },
  deployment: {
    apiVersion: 'apps/v1beta1',
    kind: 'Deployment',
    metadata: {
      namespace: 'data',
      name: 'dbadmin',
      owner: 'npm',
      branch: 'master'
    },
    spec: {
      replicas: 2,
      revisionHistoryLimit: 1,
      strategy: {
        rollingUpdate: {
          maxUnavailable: 1,
          maxSurge: 1
        }
      },
      template: {
        metadata: {
          labels: {
            app: 'dbadmin',
            task: 'admin'
          }
        },
        spec: {
          containers: [
            {
              name: 'dbadmin',
              image: 'pretend/mydb:1.0.0',
              resources: {
                requests: {
                  memory: '100Mi',
                  cpu: 0.5
                },
                limits: {
                  memory: '512Mi',
                  cpu: 1
                }
              },
              command: [
                'bash',
                '-exc',
                'export',
                'HOST="$(hostname).datums"',
                'admin'
              ],
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
                  name: 'http',
                  containerPort: 8081,
                  protocol: 'TCP'
                }
              ],
              volumeMounts: [
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
      }
    }
  },
  services: [
    {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        namespace: 'data',
        name: 'dbadmin',
        labels: {
          app: 'dbadmin',
          task: 'admin',
          'kubernetes.io/cluster-service': 'false'
        }
      },
      spec: {
        selector: {
          app: 'dbadmin'
        },
        ports: [
          {
            name: 'http',
            port: 8081,
            protocol: 'TCP',
            targetPort: 8081
          }
        ]
      }
    }
  ],
  nginxBlock: `
    server {
      listen    443 ssl;
      listen    [::]:443 ssl;
      root      /usr/shar/nginx/html;

      ssl on;
      ssl_certificate       "/etc/nginx/cert/cert.pem";
      ssl_certificate_key   "/etc/nginx/cert/cert.pem";

      ssl_session_cache shared:SSL:1m;
      ssl_session_timeout 10m;
      ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
      ssl_ciphers HIGH:SEED:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!RSAPSK:!aDH:!aECDH:!EDH-DSS-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA:!SRP;
      ssl_prefer_server_ciphers on;

      server_name   ~^dbadmin[.].*$;

      location / {
        resolver            kube-dns.kube-system valid=1s;
        set $server         dbadmin.data.svc.cluster.local:8081;
        rewrite             ^/(.*) /$1 break;
        proxy_pass          http://$server;
        proxy_set_header    Host $host;
        proxy_set_header    X-Real-IP $remote_addr;
        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $scheme;
      }
    }`
}
