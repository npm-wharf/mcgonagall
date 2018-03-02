module.exports = {
  networkPolicy: {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'NetworkPolicy',
    metadata: {
      name: 'accept-all-ingress',
      namespace: 'default',
      labels: {
        name: 'accept-all-ingress',
        namespace: 'default'
      }
    },
    spec: {
      podSelector: {
      },
      policyTypes: [
        'Ingress'
      ],
      ingress: [
        {}
      ]
    }
  }
}
