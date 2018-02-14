module.exports = {
  fqn: 'role-name.my-namespace',
  name: 'role-name',
  namespace: 'my-namespace',
  account: {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: {
      name: 'some-account',
      namespace: 'my-namespace'
    }
  },
  role: {
    kind: 'Role',
    apiVersion: 'rbac.authorization.k8s.io/v1',
    metadata: {
      name: 'some-role',
      namespace: 'my-namespace'
    },
    rules: [
      {
        apiGroups: [''],
        resources: ['secrets'],
        verbs: ['create', 'get', 'update', 'delete']
      }
    ]
  },
  roleBinding: {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name: 'some-account',
      namespace: 'my-namespace'
    },
    roleRef:
    {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'Role',
      name: 'some-role'
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: 'some-account',
        namespace: 'my-namespace'
      }
    ]
  }
}
