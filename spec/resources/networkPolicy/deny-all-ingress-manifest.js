module.exports = {
  networkPolicy: {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'NetworkPolicy',
    metadata: {
      name: 'deny-all-ingress',
      namespace: 'default',
      labels: {
        name: 'deny-all-ingress',
        namespace: 'default'
      }
    },
    spec: {
      podSelector: {
      },
      policyTypes: [
        'Ingress'
      ]
    }
  }
}
