module.exports = {
  networkPolicy: {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'NetworkPolicy',
    metadata: {
      name: 'deny-all-egress',
      namespace: 'default',
      labels: {
        name: 'deny-all-egress',
        namespace: 'default'
      }
    },
    spec: {
      podSelector: {
      },
      policyTypes: [
        'Egress'
      ]
    }
  }
}
