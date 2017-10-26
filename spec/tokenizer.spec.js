require('./setup')

const fs = require('fs')
const path = require('path')
const tokenizer = require('../src/tokenizer')

const plain = fs.readFileSync(path.resolve('./spec/plain-source/cluster.toml'), 'utf8')
const template = fs.readFileSync(path.resolve('./spec/template.toml'), 'utf8')

describe('Expression Parser', function () {
  it('should detect the presence of tokens', function () {
    tokenizer.hasTokens(plain).should.equal(false)
    tokenizer.hasTokens(template).should.equal(true)
  })

  it('should get a list of the tokens', function () {
    tokenizer.getTokens(plain).should.eql([])
    tokenizer.getTokens(template).should.eql([
      'namespace',
      'elk-start'
    ])
  })
})
