'use strict'
const path = require('path')
const { ERR_INVALID_LINK } = require('pear-errors')
const hid = require('hypercore-id-encoding')
const FILE = 'file:'
const PEAR = 'pear:'
const DOUB = '//'

class PearLink {
  normalize(link) {
    // if link has link format, separator is always '/' even in Windows
    if (link.startsWith(FILE + DOUB)) {
      return link.endsWith('/') ? link.slice(0, -1) : link
    } else return link.endsWith(path.sep) ? link.slice(0, -1) : link
  }

  serialize(o) {
    o = hid.isValid(o) ? { drive: { key: o } } : o
    let { protocol, pathname = '', search = '', hash = '', drive } = o
    if (protocol === FILE) return `${protocol}//${pathname}${search}${hash}`
    if (!protocol && drive) protocol = PEAR
    if (protocol === PEAR) {
      const key = hid.normalize(drive.key)
      const base = [
        drive.fork,
        drive.length,
        key,
        drive.hash && hid.encode(drive.hash)
      ]
        .filter((p) => (p ?? '') + '')
        .join('.')
      return `${protocol}//${base}${pathname}${search}${hash}`
    }
    throw ERR_INVALID_LINK('Unsupported protocol', {
      protocol,
      pathname,
      search,
      hash,
      drive
    })
  }

  parse(link) {
    if (!link) throw ERR_INVALID_LINK('No link specified', { link })
    const isPath =
      link.startsWith(PEAR + DOUB) === false &&
      link.startsWith(FILE + DOUB) === false
    const isRelativePath = isPath && link[0] !== '/' && link[1] !== ':'
    const { protocol, pathname, hostname, search, hash } = isRelativePath
      ? new URL(link, FILE + DOUB + path.resolve('.') + '/')
      : new URL(isPath ? FILE + DOUB + link : link)
    const info = { link, protocol, hostname, pathname, search, hash }
    if (protocol === FILE) {
      // file:///some/path/to/a/file.js
      const startsWithRoot = hostname === ''
      if (!pathname) throw ERR_INVALID_LINK('Path is missing', info)
      if (!startsWithRoot) {
        throw ERR_INVALID_LINK('Path needs to start from the root, "/"', info)
      }
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
      const [fork, length, key, apphash] = hostname.split('.')
      const parts = hostname.split('.').length

      if (parts === 1) {
        // pear://key[/some/path]
        const key = hostname
        const origin = `${protocol}//${hostname}`
        return {
          protocol,
          pathname,
          search,
          hash,
          origin,
          drive: {
            key: hid.decode(key),
            length: null,
            fork: null,
            hash: null
          }
        }
      }

      if (parts === 2) {
        // pear://fork.length[/some/path]
        throw ERR_INVALID_LINK('Incorrect hostname', info)
      }

      const origin = `${protocol}//${key}`

      if (parts === 3) {
        // pear://fork.length.key[/some/path]
        if (!Number.isInteger(+fork) || !Number.isInteger(+length)) {
          throw ERR_INVALID_LINK('Incorrect hostname', info)
        }
        return {
          protocol,
          pathname,
          search,
          hash,
          origin,
          drive: {
            key: hid.decode(key),
            length: Number(length),
            fork: Number(fork),
            hash: null
          }
        }
      }

      if (parts === 4) {
        // pear://fork.length.key.dhash[/some/path]
        if (!Number.isInteger(+fork) || !Number.isInteger(+length)) {
          throw ERR_INVALID_LINK('Incorrect hostname', info)
        }

        return {
          protocol,
          pathname,
          search,
          hash,
          origin,
          drive: {
            key: hid.decode(key),
            length: Number(length),
            fork: Number(fork),
            hash: hid.decode(apphash)
          }
        }
      }

      throw ERR_INVALID_LINK('Incorrect hostname', info)
    }

    throw ERR_INVALID_LINK('Protocol is not supported', info)
  }
}

module.exports = new PearLink()
