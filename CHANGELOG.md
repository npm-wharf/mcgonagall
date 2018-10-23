# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.10.2"></a>
## [1.10.2](https://github.com/npm-wharf/mcgonagall/compare/v1.10.1...v1.10.2) (2018-10-23)


### Bug Fixes

* correct path issue with imagePullSecret and cronJob specification ([a3ae408](https://github.com/npm-wharf/mcgonagall/commit/a3ae408))



<a name="1.10.1"></a>
## [1.10.1](https://github.com/npm-wharf/mcgonagall/compare/v1.10.0...v1.10.1) (2018-10-23)


### Bug Fixes

* add support for image pull secret use with registries that make use of complex path structures ([9597342](https://github.com/npm-wharf/mcgonagall/commit/9597342))



<a name="1.10.0"></a>
# [1.10.0](https://github.com/npm-wharf/mcgonagall/compare/v1.9.0...v1.10.0) (2018-10-20)


### Bug Fixes

* add fingerprint hashes to output specifications to help with detection of deploy targets ([7775892](https://github.com/npm-wharf/mcgonagall/commit/7775892))
* correct defect around imagePullPolicy setting ([408fb56](https://github.com/npm-wharf/mcgonagall/commit/408fb56))


### Features

* add support for secrets and imagePullSecrets, improve layout of spec folder. ([364ced1](https://github.com/npm-wharf/mcgonagall/commit/364ced1))
* expand label metadata for consistentcy and improved selectivity ([cf00bdd](https://github.com/npm-wharf/mcgonagall/commit/cf00bdd))



<a name="1.9.2"></a>
# [1.9.2](https://github.com/npm-wharf/mcgonagall/compare/v1.9.1...v1.9.2) (2018-03-20)


### Bug Fixes

* correct defect around imagePullPolicy setting ([f0065b0](https://github.com/npm-wharf/mcgonagall/commit/f0065b0))


<a name="1.9.1"></a>
# [1.9.1](https://github.com/npm-wharf/mcgonagall/compare/v1.9.0...v1.9.1) (2018-03-07)


### Features

* expand label metadata for consistentcy and improved selectivity ([cf00bdd](https://github.com/npm-wharf/mcgonagall/commit/cf00bdd))



<a name="1.9.0"></a>
# [1.9.0](https://github.com/npm-wharf/mcgonagall/compare/v1.8.1...v1.9.0) (2018-02-21)


### Features

* add support for network policies ([c8f5df3](https://github.com/npm-wharf/mcgonagall/commit/c8f5df3))



<a name="1.8.1"></a>
## [1.8.1](https://github.com/npm-wharf/mcgonagall/compare/v1.8.0...v1.8.1) (2018-02-16)


### Bug Fixes

* correct level that serviceAccountName was set at and add serviceAccount property ([8d9cb60](https://github.com/npm-wharf/mcgonagall/commit/8d9cb60))



<a name="1.8.0"></a>
# [1.8.0](https://github.com/npm-wharf/mcgonagall/compare/v1.7.5...v1.8.0) (2018-02-14)


### Features

* provide full RBAC support and allow specs to provide RBAC definitions without a service type attached ([18abaf3](https://github.com/npm-wharf/mcgonagall/commit/18abaf3))



<a name="1.7.5"></a>
## [1.7.5](https://github.com/npm-wharf/mcgonagall/compare/v1.7.4...v1.7.5) (2018-02-09)


### Bug Fixes

* improving cli probe validation and catching more invalid http and tcp probe formats ([7e084af](https://github.com/npm-wharf/mcgonagall/commit/7e084af))



<a name="1.7.4"></a>
## [1.7.4](https://github.com/npm-wharf/mcgonagall/compare/v1.7.3...v1.7.4) (2018-02-06)


### Bug Fixes

* correct probe implementation and validations affecting it ([53c1d60](https://github.com/npm-wharf/mcgonagall/commit/53c1d60))



<a name="1.7.3"></a>
## [1.7.3](https://github.com/npm-wharf/mcgonagall/compare/v1.7.2...v1.7.3) (2018-02-06)



<a name="1.7.2"></a>
## [1.7.2](https://github.com/npm-wharf/mcgonagall/compare/v1.7.1...v1.7.2) (2018-02-02)


### Bug Fixes

* correct probe formatting and add support for tcp socket probes ([0adc049](https://github.com/npm-wharf/mcgonagall/commit/0adc049))



<a name="1.7.1"></a>
## [1.7.1](https://github.com/npm-wharf/mcgonagall/compare/v1.7.0...v1.7.1) (2018-02-01)


### Bug Fixes

* correct additional path and keying errors with volume mapped config entries ([e0964e2](https://github.com/npm-wharf/mcgonagall/commit/e0964e2))



<a name="1.7.0"></a>
# [1.7.0](https://github.com/npm-wharf/mcgonagall/compare/v1.5.2...v1.7.0) (2018-02-01)


### Bug Fixes

* correct defect in how config files are mapped to volumes when path is in a nested folder relative to specification ([5ab2bba](https://github.com/npm-wharf/mcgonagall/commit/5ab2bba))


### Features

* add initial support for RBAC. fix: correct cronjob definition. refactor: break service definition module into resource based modules. ([5f85215](https://github.com/npm-wharf/mcgonagall/commit/5f85215))



<a name="1.6.0"></a>
# [1.6.0](https://github.com/npm-wharf/mcgonagall/compare/v1.5.2...v1.6.0) (2018-01-31)


### Features

* add initial support for RBAC. fix: correct cronjob definition. refactor: break service definition module into resource based modules. ([eb446dc](https://github.com/npm-wharf/mcgonagall/commit/eb446dc))



<a name="1.5.2"></a>
## [1.5.2](https://github.com/npm-wharf/mcgonagall/compare/v1.5.1...v1.5.2) (2017-11-26)


### Bug Fixes

* make selectors explicit to support change in 1.8 ([a02fc2b](https://github.com/npm-wharf/mcgonagall/commit/a02fc2b))



<a name="1.5.1"></a>
## [1.5.1](https://github.com/npm-wharf/mcgonagall/compare/v1.5.0...v1.5.1) (2017-11-22)


### Bug Fixes

* correct api namespaces for daemonset ([4781e8b](https://github.com/npm-wharf/mcgonagall/commit/4781e8b))



<a name="1.5.0"></a>
# [1.5.0](https://github.com/npm-wharf/mcgonagall/compare/v1.4.1...v1.5.0) (2017-11-21)


### Bug Fixes

* tokenizer previously overlooked files loaded into configmap volumes during first pass. This would cause mcgonagall to under-report token lists and then fail during transfiguration when tokens had not been supplied. ([5d0ebec](https://github.com/npm-wharf/mcgonagall/commit/5d0ebec))


### Features

* support specification of scaling factor during transfiguration ([9f70016](https://github.com/npm-wharf/mcgonagall/commit/9f70016))



<a name="1.4.1"></a>
## [1.4.1](https://github.com/npm-wharf/mcgonagall/compare/v1.4.0...v1.4.1) (2017-11-13)


### Bug Fixes

* correct issues with detecting multiple tokens in a single line. ([b5ae9b4](https://github.com/npm-wharf/mcgonagall/commit/b5ae9b4))



<a name="1.4.0"></a>
# [1.4.0](https://github.com/npm/mcgonagall/compare/v1.3.3...v1.4.0) (2017-11-04)


### Features

* add support for raw manifest types ([128714f](https://github.com/npm/mcgonagall/commit/128714f))



<a name="1.3.3"></a>
## [1.3.3](https://github.com/npm/mcgonagall/compare/v1.3.2...v1.3.3) (2017-11-01)


### Bug Fixes

* correction to level sorting ([90bc279](https://github.com/npm/mcgonagall/commit/90bc279))



<a name="1.3.2"></a>
## [1.3.2](https://github.com/npm/mcgonagall/compare/v1.3.1...v1.3.2) (2017-11-01)


### Bug Fixes

* convert levels to numbers before a sort ([d2d935e](https://github.com/npm/mcgonagall/commit/d2d935e))



<a name="1.3.1"></a>
## [1.3.1](https://github.com/npm/mcgonagall/compare/v1.3.0...v1.3.1) (2017-10-27)


### Bug Fixes

* correct job and statefulSet assumptions that scale block will always be present ([2eb3e52](https://github.com/npm/mcgonagall/commit/2eb3e52))



<a name="1.3.0"></a>
# [1.3.0](https://github.com/npm/mcgonagall/compare/v1.2.0...v1.3.0) (2017-10-27)


### Bug Fixes

* allow dash character in token names ([ab51ae2](https://github.com/npm/mcgonagall/commit/ab51ae2))


### Features

* add hash support for tokens and support for secure token collection in the CLI ([695d6ba](https://github.com/npm/mcgonagall/commit/695d6ba))



<a name="1.2.1"></a>
## [1.2.1](https://github.com/npm/mcgonagall/compare/v1.2.0...v1.2.1) (2017-10-27)


### Bug Fixes

* allow dash character in token names ([ab51ae2](https://github.com/npm/mcgonagall/commit/ab51ae2))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/npm/mcgonagall/compare/v1.1.3...v1.2.0) (2017-10-24)


### Features

* add support for more service types and more port mappings ([94d3cb6](https://github.com/npm/mcgonagall/commit/94d3cb6))



<a name="1.1.3"></a>
## [1.1.3](https://github.com/npm/mcgonagall/compare/v1.1.2...v1.1.3) (2017-10-23)


### Bug Fixes

* correct error with config maps defined in cluster spec ([d354dd5](https://github.com/npm/mcgonagall/commit/d354dd5))



<a name="1.1.2"></a>
## [1.1.2](https://github.com/npm/mcgonagall/compare/v1.1.1...v1.1.2) (2017-10-23)


### Bug Fixes

* correct path issues with tarball extraction ([af4fddd](https://github.com/npm/mcgonagall/commit/af4fddd))



<a name="1.1.1"></a>
## [1.1.1](https://github.com/npm/mcgonagall/compare/v1.1.0...v1.1.1) (2017-10-23)


### Bug Fixes

* support tar extension as well as tgz ([a1ad235](https://github.com/npm/mcgonagall/commit/a1ad235))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/npm/mcgonagall/compare/v1.0.1...v1.1.0) (2017-10-22)


### Bug Fixes

* add support for multi-line commands ([59bc635](https://github.com/npm/mcgonagall/commit/59bc635))
* correct rolling update properties for stateful sets ([13f2deb](https://github.com/npm/mcgonagall/commit/13f2deb))
* correct stateful set strategy property name ([3867060](https://github.com/npm/mcgonagall/commit/3867060))
* find and replace tab characters in multi-line toml so that it doesn't break yaml output as multi-line ([ade76c7](https://github.com/npm/mcgonagall/commit/ade76c7))
* output CPU units in m, do not include env or ports properties on containers when empty arrays ([412dd08](https://github.com/npm/mcgonagall/commit/412dd08))
* remove unsupported job properties ([81dd969](https://github.com/npm/mcgonagall/commit/81dd969))
* support arbitrary subfolders in source specification ([86e57fb](https://github.com/npm/mcgonagall/commit/86e57fb))


### Features

* add ability to specify permissions for volumes mapped to config maps or secrets ([0532649](https://github.com/npm/mcgonagall/commit/0532649))
* add support for custom container security context settings ([ad496e6](https://github.com/npm/mcgonagall/commit/ad496e6))
* add support for git sources and tokenized specifications ([b59c900](https://github.com/npm/mcgonagall/commit/b59c900))
* add support for jobs, cron jobs and secrets as volumes ([95d58c9](https://github.com/npm/mcgonagall/commit/95d58c9))
* add support for multiple Kubernetes API versions ([25c3c8d](https://github.com/npm/mcgonagall/commit/25c3c8d))
* move top level service properties under a service block ([1a6f248](https://github.com/npm/mcgonagall/commit/1a6f248))
* support git urls as sources for cluster specifications ([999be52](https://github.com/npm/mcgonagall/commit/999be52))
* write config maps to separate files when writing output ([7ea9fe1](https://github.com/npm/mcgonagall/commit/7ea9fe1))



<a name="1.0.1"></a>
## 1.0.1 (2017-10-13)


### Bug Fixes

* correct bad kubernetes namespace in the role reference namespace created for cluster role bindings ([4bb194b](https://github.com/npm/mcgonagall/commit/4bb194b))
