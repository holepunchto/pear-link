'use strict'
const path = require('path')
const { ERR_INVALID_LINK } = require('pear-errors')
const { ALIASES } = require('pear-aliases')
const { encode, decode } = require('hypercore-id-encoding')
const FILE = 'file:'
const PEAR = 'pear:'
const DOUB = '//'

class PearLink {
  normalize (link) {
    // if link has url format, separator is always '/' even in Windows
    if (link.startsWith(FILE + DOUB)) return link.endsWith('/') ? link.slice(0, -1) : link
    else return link.endsWith(path.sep) ? link.slice(0, -1) : link
  }

  serialize ({ protocol, pathname, search = '', hash = '', drive }) {
    if (protocol === FILE) return `${protocol}//${pathname}${search}${hash}`

    if (protocol === PEAR) {
      const key = drive.alias || encode(drive.key)
      const base = [drive.fork, drive.length, key, drive.hash && encode(drive.hash)].filter((p) => (p ?? '') + '').join('.')
      return `${protocol}//${base}${pathname}${search}${hash}`
    }

    throw ERR_INVALID_LINK('Unsupported protocol')
  }

  parse (url) {
    if (!url) throw ERR_INVALID_LINK('No link specified')
    const isPath = url.startsWith(PEAR + DOUB) === false && url.startsWith(FILE + DOUB) === false
    const isRelativePath = isPath && url[0] !== '/' && url[1] !== ':'
    const keys = Object.fromEntries(Object.entries(ALIASES).map(([k, v]) => [encode(v), k]))
    const {
      protocol,
      pathname,
      hostname,
      search,
      hash
    } = isRelativePath ? new URL(url, FILE + DOUB + path.resolve('.') + '/') : new URL(isPath ? FILE + DOUB + url : url)
    if (protocol === FILE) {
      // file:///some/path/to/a/file.js
      const startsWithRoot = hostname === ''
      if (!pathname) throw ERR_INVALID_LINK('Path is missing')
      if (!startsWithRoot) throw ERR_INVALID_LINK('Path needs to start from the root, "/"')
      return {
        protocol,
        pathname,
        search,
        hash,
        origin: this.normalize(`${protocol}//${hostname}${pathname}`),
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
        const key = ALIASES[hostname] || decode(hostname)
        const origin = keys[encode(key)] ? `${protocol}//${keys[encode(key)]}` : `${protocol}//${hostname}`
        const alias = ALIASES[hostname] ? hostname : null
        return {
          protocol,
          pathname,
          search,
          hash,
          origin,
          drive: {
            key,
            length: null,
            fork: null,
            hash: null,
            alias
          }
        }
      }

      if (parts === 2) { // pear://fork.length[/some/path]
        throw ERR_INVALID_LINK('Incorrect hostname')
      }

      const alias = ALIASES[keyOrAlias] ? keyOrAlias : null
      const key = ALIASES[keyOrAlias] || decode(keyOrAlias)
      const origin = keys[encode(key)] ? `${protocol}//${keys[encode(key)]}` : `${protocol}//${keyOrAlias}`

      if (parts === 3) { // pear://fork.length.keyOrAlias[/some/path]
        if (!Number.isInteger(+fork) || !Number.isInteger(+length)) throw ERR_INVALID_LINK('Incorrect hostname')
        return {
          protocol,
          pathname,
          search,
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
        if (!Number.isInteger(+fork) || !Number.isInteger(+length)) throw ERR_INVALID_LINK('Incorrect hostname')

        return {
          protocol,
          pathname,
          search,
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

      throw ERR_INVALID_LINK('Incorrect hostname')
    }

    throw ERR_INVALID_LINK('Protocol is not supported')
  }
}

module.exports = new PearLink()
