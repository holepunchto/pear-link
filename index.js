'use strict'
const path = require('path')
const { encode, decode } = require('hypercore-id-encoding')
const FILE = 'file:'
const PEAR = 'pear:'
const DOUB = '//'

module.exports = class PearLink {
  constructor (aliases = {}, E = Error) {
    this.aliases = aliases
    this.Error = E
  }

  normalize (link) {
    // if link has url format, separator is always '/' even in Windows
    if (link.startsWith(FILE + DOUB)) return link.endsWith('/') ? link.slice(0, -1) : link
    else return link.endsWith(path.sep) ? link.slice(0, -1) : link
  }

  serialize ({ protocol, pathname, search = '', hash = '', drive }) {
    if (protocol === FILE) return `${protocol}//${pathname}${search}${hash}`

    if (protocol === PEAR) {
      const key = drive.alias || encode(drive.key)
      const base = [drive.fork, drive.length, key, drive.hash && encode(drive.hash)].filter(Boolean).join('.')
      return `${protocol}//${base}${pathname}${search}${hash}`
    }

    throw new this.Error('Unsupported protocol')
  }

  parse (url) {
    const { aliases, Error } = this
    if (!url) throw new Error('No link specified')
    const isPath = url.startsWith(PEAR + DOUB) === false && url.startsWith(FILE + DOUB) === false
    const isRelativePath = isPath && url[0] !== '/' && url[1] !== ':'
    const keys = Object.fromEntries(Object.entries(aliases).map(([k, v]) => [encode(v), k]))
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
      if (!pathname) throw new Error('Path is missing')
      if (!startsWithRoot) throw new Error('Path needs to start from the root, "/"')
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
        const key = aliases[hostname] || decode(hostname)
        const origin = keys[encode(key)] ? `${protocol}//${keys[encode(key)]}` : `${protocol}//${hostname}`
        const alias = aliases[hostname] ? hostname : null
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
        throw new Error('Incorrect hostname')
      }

      const alias = aliases[keyOrAlias] ? keyOrAlias : null
      const key = aliases[keyOrAlias] || decode(keyOrAlias)
      const origin = keys[encode(key)] ? `${protocol}//${keys[encode(key)]}` : `${protocol}//${keyOrAlias}`

      if (parts === 3) { // pear://fork.length.keyOrAlias[/some/path]
        if (!Number.isInteger(+fork) || !Number.isInteger(+length)) throw new Error('Incorrect hostname')
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
        if (!Number.isInteger(+fork) || !Number.isInteger(+length)) throw new Error('Incorrect hostname')

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

      throw new Error('Incorrect hostname')
    }

    throw new Error('Protocol is not supported')
  }
}
