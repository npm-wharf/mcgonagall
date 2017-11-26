# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
