const VERSION_MAP = {
  account: {
    '1.4': 'v1',
    '1.5': 'v1',
    '1.6': 'v1',
    '1.7': 'v1',
    '1.8': 'v1',
    '1.9': 'v1',
    '1.10': 'v1',
    '1.11': 'v1',
    '1.12': 'v1',
    '1.13': 'v1',
    '1.14': 'v1',
    '1.15': 'v1'
  },
  config: {
    '1.4': 'v1',
    '1.5': 'v1',
    '1.6': 'v1',
    '1.7': 'v1',
    '1.8': 'v1',
    '1.9': 'v1',
    '1.10': 'v1',
    '1.11': 'v1',
    '1.12': 'v1',
    '1.13': 'v1',
    '1.14': 'v1',
    '1.15': 'v1'
  },
  cronjob: {
    '1.4': 'batch/v2alpha1',
    '1.5': 'batch/v2alpha1',
    '1.6': 'batch/v2alpha1',
    '1.7': 'batch/v2alpha1',
    '1.8': 'batch/v1beta1',
    '1.9': 'batch/v1beta1',
    '1.10': 'batch/v1beta1',
    '1.11': 'batch/v1beta1',
    '1.12': 'batch/v1beta1',
    '1.13': 'batch/v1beta1',
    '1.14': 'batch/v1beta1',
    '1.15': 'batch/v1beta1'
  },
  daemonSet: {
    '1.4': 'extensions/v1beta1',
    '1.5': 'extensions/v1beta1',
    '1.6': 'extensions/v1beta1',
    '1.7': 'extensions/v1beta1',
    '1.8': 'apps/v1beta2',
    '1.9': 'apps/v1',
    '1.10': 'apps/v1',
    '1.11': 'apps/v1',
    '1.12': 'apps/v1',
    '1.13': 'apps/v1',
    '1.14': 'apps/v1',
    '1.15': 'apps/v1'
  },
  deployment: {
    '1.4': 'extensions/v1beta1',
    '1.5': 'extensions/v1beta1',
    '1.6': 'apps/v1beta1',
    '1.7': 'apps/v1beta1',
    '1.8': 'apps/v1beta2',
    '1.9': 'apps/v1',
    '1.10': 'apps/v1',
    '1.11': 'apps/v1',
    '1.12': 'apps/v1',
    '1.13': 'apps/v1',
    '1.14': 'apps/v1',
    '1.15': 'apps/v1'
  },
  job: {
    '1.4': 'batch/v1',
    '1.5': 'batch/v1',
    '1.6': 'batch/v1',
    '1.7': 'batch/v1',
    '1.8': 'batch/v1',
    '1.9': 'batch/v1',
    '1.10': 'batch/v1',
    '1.11': 'batch/v1',
    '1.12': 'batch/v1',
    '1.13': 'batch/v1',
    '1.14': 'batch/v1',
    '1.15': 'batch/v1'
  },
  networkPolicy: {
    '1.4': 'networking.k8s.io/v1',
    '1.5': 'networking.k8s.io/v1',
    '1.6': 'networking.k8s.io/v1',
    '1.7': 'networking.k8s.io/v1',
    '1.8': 'networking.k8s.io/v1',
    '1.9': 'networking.k8s.io/v1',
    '1.10': 'networking.k8s.io/v1',
    '1.11': 'networking.k8s.io/v1',
    '1.12': 'networking.k8s.io/v1',
    '1.13': 'networking.k8s.io/v1',
    '1.14': 'networking.k8s.io/v1',
    '1.15': 'networking.k8s.io/v1'
  },
  role: {
    '1.4': 'rbac.authorization.k8s.io/v1beta1',
    '1.5': 'rbac.authorization.k8s.io/v1beta1',
    '1.6': 'rbac.authorization.k8s.io/v1beta1',
    '1.7': 'rbac.authorization.k8s.io/v1beta1',
    '1.8': 'rbac.authorization.k8s.io/v1',
    '1.9': 'rbac.authorization.k8s.io/v1',
    '1.10': 'rbac.authorization.k8s.io/v1',
    '1.11': 'rbac.authorization.k8s.io/v1',
    '1.12': 'rbac.authorization.k8s.io/v1',
    '1.13': 'rbac.authorization.k8s.io/v1',
    '1.14': 'rbac.authorization.k8s.io/v1',
    '1.15': 'rbac.authorization.k8s.io/v1'
  },
  roleBinding: {
    '1.4': 'rbac.authorization.k8s.io/v1beta1',
    '1.5': 'rbac.authorization.k8s.io/v1beta1',
    '1.6': 'rbac.authorization.k8s.io/v1beta1',
    '1.7': 'rbac.authorization.k8s.io/v1beta1',
    '1.8': 'rbac.authorization.k8s.io/v1',
    '1.9': 'rbac.authorization.k8s.io/v1',
    '1.10': 'rbac.authorization.k8s.io/v1',
    '1.11': 'rbac.authorization.k8s.io/v1',
    '1.12': 'rbac.authorization.k8s.io/v1',
    '1.13': 'rbac.authorization.k8s.io/v1',
    '1.14': 'rbac.authorization.k8s.io/v1',
    '1.15': 'rbac.authorization.k8s.io/v1'
  },
  secret: {
    '1.4': 'v1',
    '1.5': 'v1',
    '1.6': 'v1',
    '1.7': 'v1',
    '1.8': 'v1',
    '1.9': 'v1',
    '1.10': 'v1',
    '1.11': 'v1',
    '1.12': 'v1',
    '1.13': 'v1',
    '1.14': 'v1',
    '1.15': 'v1'
  },
  service: {
    '1.4': 'v1',
    '1.5': 'v1',
    '1.6': 'v1',
    '1.7': 'v1',
    '1.8': 'v1',
    '1.9': 'v1',
    '1.10': 'v1',
    '1.11': 'v1',
    '1.12': 'v1',
    '1.13': 'v1',
    '1.14': 'v1',
    '1.15': 'v1'
  },
  statefulSet: {
    '1.4': 'apps/v1beta1',
    '1.5': 'apps/v1beta1',
    '1.6': 'apps/v1beta1',
    '1.7': 'apps/v1beta1',
    '1.8': 'apps/v1beta2',
    '1.9': 'apps/v1',
    '1.10': 'apps/v1',
    '1.11': 'apps/v1',
    '1.12': 'apps/v1',
    '1.13': 'apps/v1',
    '1.14': 'apps/v1',
    '1.15': 'apps/v1'
  }
}

function getApiVersion (config, type) {
  if (!config.apiVersion) {
    console.trace(`searching for apiVersion '${config.apiVersion}' of '${type}'`)
  }
  return VERSION_MAP[type][config.apiVersion]
}

module.exports = {
  map: VERSION_MAP,
  getApiVersion: getApiVersion
}
