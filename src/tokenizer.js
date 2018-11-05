const _ = require('lodash')
const TAG_REGEX = /<%[+-=]?[ ]*(([^%]|(%(?!>)))*)[ ]*%>/g
const TOKEN_REGEX = /((['"][^'"]+['"])|([a-zA-Z][_a-zA-Z0-9.]+)[(]|([a-zA-Z][_a-zA-Z0-9.]+))/g

function getMatches (regex, string, index) {
  let last
  const list = []
  do {
    last = regex.exec(string)
    if (last && last[index]) {
      list.push(last[index])
    }
  } while (last)
  return _.uniq(list)
}

function getTokens (content) {
  const tags = getMatches(TAG_REGEX, content, 0)
  const tokens = tags.reduce((acc, tag) => {
    getMatches(TOKEN_REGEX, tag, 4)
      .forEach(token => {
        if (!/['"]/.test(token)) {
          acc.push(token)
        }
      })
    return acc
  }, [])
  return _.uniq(tokens)
}

function hasTokens (content) {
  TAG_REGEX.lastIndex = 0
  return TAG_REGEX.test(content)
}

module.exports = {
  getTokens: getTokens,
  hasTokens: hasTokens
}
