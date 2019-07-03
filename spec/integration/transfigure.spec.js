require('../setup')
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const readdir = promisify(fs.readdir)
const readFile = promisify(fs.readFile)
const stat = promisify(fs.stat) // for pre node 10 shim
const rimraf = require('rimraf') // behold i am become rimraf destroyer of files
const sinon = require('sinon')

const fileWriter = require('../../src/writers/file')
const objectWriter = require('../../src/writers/object')
const index = require('../../src/index')

// for pre node 10 shim
const NODEV = {};
[NODEV.major, NODEV.minor, NODEV.patch] = process.versions.node.split('.').map(x => parseInt(x))
const NODIRENT = NODEV.major < 10 || (NODEV.major === 10 && NODEV.minor < 10)

// controls whether or not integration tests
// remove output directories after test
const DELETE_OUTPUT_AFTER_TESTS = false

function eraseOutput (done, output, eraseOutput = DELETE_OUTPUT_AFTER_TESTS) {
  if (eraseOutput) {
    rimraf(`./spec/integration/target/${output}`, (ohnoes) => {
      if (ohnoes) {
        console.log('McGonagall frowns and offers you a biscuit all the same.', ohnoes)
      }
      done()
    })
  } else {
    done()
  }
}

async function loadVerificationSpec (target) {
  const loadedSpec = {}
  const currentDir = await readdir(target, { withFileTypes: true })

  // recurse on subdirs, load files
  for (let dirent of currentDir) {
    if (NODIRENT) { // Remove this block when dropping node 8 support
      const currentStat = await stat(path.join(target, dirent))
      dirent = {
        name: dirent,
        isDirectory: () => currentStat.isDirectory(),
        isFile: () => currentStat.isFile()
      }
    }

    const thisPath = path.join(target, dirent.name)
    if (dirent.isDirectory()) {
      loadedSpec[dirent.name] = loadVerificationSpec(thisPath)
    } else if (dirent.isFile()) {
      loadedSpec[dirent.name] = readFile(thisPath, { encoding: 'utf8' })
    }
  }

  // map all the promises to resolve, then assign back into the original object
  return Object.assign(loadedSpec, ...await Promise.all(
    Object.entries(loadedSpec).map(
      async ([key, value]) => ({ [key]: await value })
    )
  ))
}

const clusterSpecification = require('./verify/clusterSpecification')
const tokenSpecification = require('./verify/tokenSpecification')

describe('Transfiguration', function () {
  before(function (done) {
    // If we don't erase any existing build first, we're likely to get invalid results
    eraseOutput(done, '', true)
  })

  describe('from a spec containing affinity rules', function () {
    let affinityVerification //eslint-disable-line
    before(async function () {
      affinityVerification = await loadVerificationSpec(path.resolve('spec/integration/verify/affinities'))
      sinon.stub(fileWriter, 'prepare').callsFake(objectWriter.prepare)
      sinon.stub(fileWriter, 'write').callsFake(objectWriter.write)
    })

    after(function () {
      sinon.restore()
    })

    it('should create a cluster that supports affinities', async function () {
      await index.transfigure(
        './spec/integration/source/affinities',
        { output: './spec/integration/target/affinities' }
      )
      return objectWriter.result().should.deep.equal(affinityVerification)
    })
  })

  describe('from a plain spec without a target directory', function () {
    it('should create a full cluster specification object', function () {
      return index.transfigure('./spec/integration/source/plain-source')
        .then(cluster => {
          return cluster.should.eql(clusterSpecification)
        })
    })
  })
  describe('from a tokenized spec without a target directory', function () {
    it('should reject with a list of tokens in the spec when data is missing', function () {
      return index.transfigure('./spec/integration/source/tokenized-source', { version: '1.7' })
        .then(
          null,
          err => {
            return Promise.all([
              err.tokens.should.eql(['namespace', 'domain', 'username', 'password']),
              err.specPath.should.eql(path.resolve('./spec/integration/source/tokenized-source'))
            ])
          }
        )
    })

    it('should resolve to a cluster specification with tokens resolved when data is included', function () {
      return index.transfigure('./spec/integration/source/tokenized-source', {
        data: {
          domain: 'test.com',
          namespace: 'infra',
          username: 'admin',
          password: 'pass'
        }
      })
        .then(cluster => {
          return cluster.should.eql(tokenSpecification)
        })
    })
  })

  describe('from a plain spec with a target directory', function () {
    it('should output files', function () {
      return index.transfigure('./spec/integration/source/plain-source', { output: './spec/integration/target/plain-target' })
        .then(cluster => {
          const json1 = fs.readFileSync('./spec/integration/verify/plain-verify/cluster.json', 'utf8')
          const json2 = fs.readFileSync('./spec/integration/target/plain-target/cluster.json', 'utf8')
          const c1 = JSON.parse(json1)
          const c2 = JSON.parse(json2)
          assert.deepStrictEqual(c1, c2)
          assert.strict.equal(json1, json2)
        })
    })

    after(function (done) {
      eraseOutput(done, 'plain-target')
    })
  })

  describe('from a spec with scale levels', function () {
    describe('when scale is small', function () {
      it('should output files', function () {
        return index.transfigure('./spec/integration/source/scale-source', { output: './spec/integration/target/scale-target/small', scale: 'small' })
          .then(cluster => {
            const json1 = fs.readFileSync('./spec/integration/verify/scale-verify/small/cluster.json', 'utf8')
            const json2 = fs.readFileSync('./spec/integration/target/scale-target/small/cluster.json', 'utf8')
            const c1 = JSON.parse(json1)
            const c2 = JSON.parse(json2)
            assert.deepStrictEqual(c1, c2)
            assert.strict.equal(json1, json2)
          })
      })

      after(function (done) {
        eraseOutput(done, 'scale-target')
      })
    })

    describe('when scale is medium', function () {
      it('should output files', function () {
        return index.transfigure('./spec/integration/source/scale-source', { output: './spec/integration/target/scale-target/medium', scale: 'medium' })
          .then(cluster => {
            const json1 = fs.readFileSync('./spec/integration/verify/scale-verify/medium/cluster.json', 'utf8')
            const json2 = fs.readFileSync('./spec/integration/target/scale-target/medium/cluster.json', 'utf8')
            const c1 = JSON.parse(json1)
            const c2 = JSON.parse(json2)
            assert.deepStrictEqual(c1, c2)
            assert.strict.equal(json1, json2)
          })
      })

      after(function (done) {
        eraseOutput(done, 'scale-target')
      })
    })

    describe('when scale is large', function () {
      it('should output files', function () {
        return index.transfigure('./spec/integration/source/scale-source', { output: './spec/integration/target/scale-target/large', scale: 'large' })
          .then(cluster => {
            const json1 = fs.readFileSync('./spec/integration/verify/scale-verify/large/cluster.json', 'utf8')
            const json2 = fs.readFileSync('./spec/integration/target/scale-target/large/cluster.json', 'utf8')
            const c1 = JSON.parse(json1)
            const c2 = JSON.parse(json2)
            assert.deepStrictEqual(c1, c2)
            assert.strict.equal(json1, json2)
          })
      })

      after(function (done) {
        eraseOutput(done, 'scale-target')
      })
    })
  })

  describe('from a tokenized spec with a target directory', function () {
    it('should output files', function () {
      return index.transfigure('./spec/integration/source/tokenized-source', {
        version: '1.7',
        output: './spec/integration/target/tokenized-target',
        data: {
          namespace: 'infra',
          domain: 'test.com',
          username: 'admin',
          password: 'pass'
        }
      })
        .then(cluster => {
          const json1 = fs.readFileSync('./spec/integration/verify/tokenized-verify/cluster.json', 'utf8')
          const json2 = fs.readFileSync('./spec/integration/target/tokenized-target/cluster.json', 'utf8')
          const c1 = JSON.parse(json1)
          const c2 = JSON.parse(json2)

          assert.deepStrictEqual(c1, c2)
          assert.strict.equal(json1, json2)
        })
    })

    after(function (done) {
      eraseOutput(done, 'tokenized-target')
    })
  })

  describe('from a tokenized git repo with a target directory', function () {
    it('should output files', function () {
      return index.transfigure('git://github.com/arobson/elk-spec', {
        gitBasePath: './spec/integration/target/git',
        output: './spec/integration/target/tokenized-git',
        version: '1.7',
        data: {
          namespace: 'infra',
          domain: 'test.com'
        }
      })
        .then(cluster => {
          const json1 = fs.readFileSync('./spec/integration/verify/tokenized-verify/cluster.json', 'utf8')
          const json2 = fs.readFileSync('./spec/integration/target/tokenized-git/cluster.json', 'utf8')
          const c1 = JSON.parse(json1)
          const c2 = JSON.parse(json2)

          assert.deepStrictEqual(c1, c2)
          assert.strict.equal(json1, json2)
        })
    })

    after(function (done) {
      eraseOutput(() => eraseOutput(done, 'git'), 'tokenized-git')
    })
  })
})
