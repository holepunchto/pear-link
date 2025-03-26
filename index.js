'use strict'
const path = require('path')
const { pathToFileURL } = require('url-file-url')
const { decode } = require('hypercore-id-encoding')
const FILE = 'file:'
const PEAR = 'pear:'
const DOUB = '//'
function pearLink (aliases = {}, error = (msg) => { throw new Error(msg) }) {
  return function parse (url) {
    if (!url) throw error('No link specified')
    const isPath = url.startsWith(PEAR + DOUB) === false && url.startsWith(FILE + DOUB) === false
    const isRelativePath = isPath && url[0] !== '/' && url[1] !== ':'
    const keyToAlias = key => Object.keys(aliases).find(alias => aliases[alias].equals(key))
    const {
      protocol,
      pathname,
      hostname,
      hash
    } = isRelativePath ? new URL(url, FILE + DOUB + path.resolve('.') + '/') : new URL(isPath ? FILE + DOUB + url : url)
    if (protocol === FILE) {
      // file:///some/path/to/a/file.js
      const startsWithRoot = hostname === ''
      if (!pathname) throw error('Path is missing')
      if (!startsWithRoot) throw error('Path needs to start from the root, "/"')
      return {
        protocol,
        pathname,
        hash,
        origin: pearLink.normalize(pathToFileURL(pathname).href),
        drive: {
          key: null,
          length: null,
          fork: null,
          hash: null
        }
      }
    } else if (protocol === PEAR) {
      const [fork, length, keyOrAlias, apphash] = hostname.split('.')
      const parts = hostname.split('.').length

      if (parts === 1) { // pear://keyOrAlias[/some/path]
        const key = aliases[hostname] || decode(hostname)
        const origin = keyToAlias(key) ? `${protocol}//${keyToAlias(key)}` : `${protocol}//${key.toString('hex')}`
        const alias = aliases[hostname] ? hostname : null
        return {
          protocol,
          pathname,
          hash,
          origin,
          drive: {
            key,
            length: 0,
            fork: null,
            hash: null,
            alias
          }
        }
      }

      if (parts === 2) { // pear://fork.length[/some/path]
        throw error('Incorrect hostname')
      }

      const alias = aliases[keyOrAlias] ? keyOrAlias : null
      const key = aliases[keyOrAlias] || decode(keyOrAlias)
      const origin = keyToAlias(key) ? `${protocol}//${keyToAlias(key)}` : `${protocol}//${keyOrAlias}`

      if (parts === 3) { // pear://fork.length.keyOrAlias[/some/path]
        if (!Number.isInteger(+fork) || !Number.isInteger(+length)) throw error('Incorrect hostname')
        return {
          protocol,
          pathname,
          hash,
          origin,
          drive: {
            key,
            length: Number(length),
            fork: Number(fork),
            hash: null,
            alias
          }
        }
      }

      if (parts === 4) { // pear://fork.length.keyOrAlias.dhash[/some/path]
        if (!Number.isInteger(+fork) || !Number.isInteger(+length)) throw error('Incorrect hostname')

        return {
          protocol,
          pathname,
          hash,
          origin,
          drive: {
            key,
            length: Number(length),
            fork: Number(fork),
            hash: decode(apphash),
            alias
          }
        }
      }

      throw error('Incorrect hostname')
    }

    throw error('Protocol is not supported')
  }
}

pearLink.normalize = (link) => {
  if (link.startsWith(FILE + DOUB)) { // if link has url format, separator is always '/' even in Windows
    return link.endsWith('/') ? link.slice(0, -1) : link
  } else {
    return link.endsWith(path.sep) ? link.slice(0, -1) : link
  }
}

module.exports = pearLink
