require('./setup')

const hasher = require('../src/hasher')

describe('Hasher', function () {
  it('should hash md5 as valid base64 character string', function () {
    hasher.hash('md5', 'no', 'base64')
      .should.equal('f6O3Z8RgtUor5NSQMLNJxw==')
  })

  it('should hash sha1 as valid base64 character string', function () {
    hasher.hash('sha1', 'no', 'base64')
      .should.equal('/RKGNTVwxXA3mbp2mZMjt8dEewY=')
  })

  it('should hash sha256 as valid base64 character string', function () {
    hasher.hash('sha256', 'no', 'base64')
      .should.equal('k5Apjz+wxbFgSYk115yxOa7yjhxHNYtLu6YYYrnCblk=')
  })

  it('should hash bcrypt as valid base64 character string', function () {
    hasher.hash('bcrypt', 'no', 'base64')
      .should.not.equal('')
  })
})
