# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
