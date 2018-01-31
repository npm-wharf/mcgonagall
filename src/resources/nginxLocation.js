const _ = require('lodash')
const fs = require('fs')
const path = require('path')

const DEFAULT_CERT_PATH = '/etc/nginx/cert/cert.pem'
const DEFAULT_KEY_PATH = '/etc/nginx/cert/cert.pem'
const DEFAULT_ROOT_PATH = '/usr/shar/nginx/html'

const DEFAULT_TEMPLATE = `
    server {
      listen    443 ssl;
      listen    [::]:443 ssl;
      root      <%=nginxRoot%>;

      ssl on;
      ssl_certificate       "<%=certPath%>";
      ssl_certificate_key   "<%=certKey%>";

      ssl_session_cache shared:SSL:1m;
      ssl_session_timeout 10m;
      ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
      ssl_ciphers HIGH:SEED:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!RSAPSK:!aDH:!aECDH:!EDH-DSS-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA:!SRP;
      ssl_prefer_server_ciphers on;

      server_name   ~^<%=subdomain%>[.].*$;

      location / {
        resolver            kube-dns.kube-system valid=1s;
        set $server         <%=fqdn%>.svc.cluster.local:<%=port%>;
        rewrite             ^/(.*) /$1 break;
        proxy_pass          http://$server;
        proxy_set_header    Host $host;
        proxy_set_header    X-Real-IP $remote_addr;
        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $scheme;
      }
    }`

/*
  nginxRoot
  certPath
  certKey
  subdomain
  fqdn
  port
*/

const blocks = {
  default: DEFAULT_TEMPLATE
}

const DEFAULT_DATA = {
  nginxRoot: DEFAULT_ROOT_PATH,
  certPath: DEFAULT_CERT_PATH,
  certKey: DEFAULT_KEY_PATH
}

function addBlock (blockName, blockPath) {
  const fullPath = path.resolve(blockPath)
  if (fs.existsSync(fullPath)) {
    blocks[blockName] = fs.readFileSync(fullPath, 'utf8')
  } else {
    throw new Error(`Could not load NGiNX location template '${blockName}' from location ${blockPath}`)
  }
}

function getBlock (blockName = 'default', data = {}) {
  const block = blocks[blockName] || DEFAULT_TEMPLATE
  const options = Object.assign({}, DEFAULT_DATA, data)
  return _.template(block)(options)
}

module.exports = {
  addBlock: addBlock,
  getBlock: getBlock
}
